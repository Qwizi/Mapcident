import uuid
import h3
from django.conf import settings
from django.db import models

from apps.categories.models import Category


def report_image_upload_path(instance, filename):
    return f'reports/{instance.report.id}/{filename}'


class Report(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        IN_REVIEW = 'in_review', 'In Review'
        RESOLVED = 'resolved', 'Resolved'
        REJECTED = 'rejected', 'Rejected'

    H3_STORAGE_RESOLUTION = 9

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    description = models.TextField()
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name='reports')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reports')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True)
    latitude = models.FloatField()
    longitude = models.FloatField()
    h3_index = models.CharField(max_length=20, db_index=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        self.h3_index = h3.latlng_to_cell(self.latitude, self.longitude, self.H3_STORAGE_RESOLUTION)
        super().save(*args, **kwargs)


class ReportImage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    report = models.ForeignKey(Report, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to=report_image_upload_path)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return f'Image {self.id} for report {self.report_id}'
