from typing import List, Optional
from django.shortcuts import get_object_or_404
from ninja import File, UploadedFile
from ninja_extra import api_controller, route
from ninja_extra.permissions import IsAuthenticated
from ninja_jwt.authentication import JWTAuth

from apps.reports.models import Report, ReportImage
from apps.reports.schemas import (
    ReportInSchema, ReportOutSchema, ReportPatchSchema,
    ReportImageOutSchema,
)


def _is_owner_or_admin(user, report):
    return user.is_admin or report.author_id == user.pk


@api_controller('/reports', tags=['Reports'])
class ReportController:

    # /map MUST be defined before /{report_id} to avoid routing conflict
    @route.get('/map', response=list, auth=None)
    def map_view(self, request, view: str = 'pins', resolution: int = 7):
        import h3 as h3lib
        from collections import defaultdict

        if view == 'hex':
            reports = Report.objects.values('latitude', 'longitude', 'h3_index')
            buckets = defaultdict(list)
            for r in reports:
                cell = h3lib.latlng_to_cell(r['latitude'], r['longitude'], resolution)
                buckets[cell].append(r)
            result = []
            for cell, items in buckets.items():
                lat, lng = h3lib.cell_to_latlng(cell)
                result.append({'h3_index': cell, 'count': len(items), 'lat': lat, 'lng': lng})
            return result
        else:
            reports = Report.objects.values(
                'id', 'title', 'status', 'latitude', 'longitude', 'h3_index', 'category_id'
            )
            return [
                {
                    'id': str(r['id']),
                    'title': r['title'],
                    'status': r['status'],
                    'lat': r['latitude'],
                    'lng': r['longitude'],
                    'h3_index': r['h3_index'],
                    'category_id': str(r['category_id']),
                }
                for r in reports
            ]

    @route.get('/', response=List[ReportOutSchema], auth=None)
    def list_reports(
        self,
        request,
        category_id: Optional[str] = None,
        status: Optional[str] = None,
        ordering: str = '-created_at',
    ):
        qs = Report.objects.select_related('category', 'author').prefetch_related('images')
        if category_id:
            qs = qs.filter(category_id=category_id)
        if status:
            qs = qs.filter(status=status)
        allowed_orderings = ['created_at', '-created_at', 'updated_at', '-updated_at']
        if ordering in allowed_orderings:
            qs = qs.order_by(ordering)
        return list(qs)

    @route.post('/', response=ReportOutSchema, auth=JWTAuth(), permissions=[IsAuthenticated])
    def create_report(self, request, payload: ReportInSchema):
        return Report.objects.create(author=request.auth, **payload.dict())

    @route.get('/{report_id}', response=ReportOutSchema, auth=None)
    def get_report(self, report_id: str):
        return get_object_or_404(
            Report.objects.prefetch_related('images'), id=report_id
        )

    @route.patch('/{report_id}', response=ReportOutSchema, auth=JWTAuth(), permissions=[IsAuthenticated])
    def update_report(self, request, report_id: str, payload: ReportPatchSchema):
        report = get_object_or_404(Report, id=report_id)
        if not _is_owner_or_admin(request.auth, report):
            from ninja_extra.exceptions import PermissionDenied
            raise PermissionDenied()
        data = payload.dict(exclude_unset=True)
        for attr, value in data.items():
            setattr(report, attr, value)
        report.save()
        return report

    @route.delete('/{report_id}', auth=JWTAuth(), permissions=[IsAuthenticated])
    def delete_report(self, request, report_id: str):
        report = get_object_or_404(Report, id=report_id)
        if not _is_owner_or_admin(request.auth, report):
            from ninja_extra.exceptions import PermissionDenied
            raise PermissionDenied()
        report.delete()
        return {'success': True}

    @route.post('/{report_id}/images', response=ReportImageOutSchema, auth=JWTAuth(), permissions=[IsAuthenticated])
    def upload_image(self, request, report_id: str, image: UploadedFile = File(...)):
        report = get_object_or_404(Report, id=report_id)
        if not _is_owner_or_admin(request.auth, report):
            from ninja_extra.exceptions import PermissionDenied
            raise PermissionDenied()
        last_order = report.images.count()
        return ReportImage.objects.create(report=report, image=image, order=last_order)

    @route.delete('/{report_id}/images/{image_id}', auth=JWTAuth(), permissions=[IsAuthenticated])
    def delete_image(self, request, report_id: str, image_id: str):
        report = get_object_or_404(Report, id=report_id)
        if not _is_owner_or_admin(request.auth, report):
            from ninja_extra.exceptions import PermissionDenied
            raise PermissionDenied()
        image = get_object_or_404(ReportImage, id=image_id, report=report)
        image.image.delete(save=False)
        image.delete()
        return {'success': True}
