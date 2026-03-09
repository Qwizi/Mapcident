from typing import List
from django.shortcuts import get_object_or_404
from ninja_extra import api_controller, route
from ninja_extra.permissions import IsAuthenticated
from ninja_jwt.authentication import JWTAuth

from apps.comments.models import Comment
from apps.comments.schemas import CommentInSchema, CommentOutSchema, CommentPatchSchema
from apps.reports.models import Report


def _is_owner_or_admin(user, comment):
    return user.is_admin or comment.author_id == user.pk


@api_controller('/reports/{report_id}/comments', tags=['Comments'])
class CommentController:

    @route.get('/', response=List[CommentOutSchema], auth=None)
    def list_comments(self, report_id: str):
        report = get_object_or_404(Report, id=report_id)
        return list(report.comments.select_related('author'))

    @route.post('/', response=CommentOutSchema, auth=JWTAuth(), permissions=[IsAuthenticated])
    def create_comment(self, request, report_id: str, payload: CommentInSchema):
        report = get_object_or_404(Report, id=report_id)
        return Comment.objects.create(report=report, author=request.auth, content=payload.content)

    @route.patch('/{comment_id}', response=CommentOutSchema, auth=JWTAuth(), permissions=[IsAuthenticated])
    def update_comment(self, request, report_id: str, comment_id: str, payload: CommentPatchSchema):
        comment = get_object_or_404(Comment, id=comment_id, report_id=report_id)
        if not _is_owner_or_admin(request.auth, comment):
            from ninja_extra.exceptions import PermissionDenied
            raise PermissionDenied()
        comment.content = payload.content
        comment.save()
        return comment

    @route.delete('/{comment_id}', auth=JWTAuth(), permissions=[IsAuthenticated])
    def delete_comment(self, request, report_id: str, comment_id: str):
        comment = get_object_or_404(Comment, id=comment_id, report_id=report_id)
        if not _is_owner_or_admin(request.auth, comment):
            from ninja_extra.exceptions import PermissionDenied
            raise PermissionDenied()
        comment.delete()
        return {'success': True}

