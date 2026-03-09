from django.contrib import admin
from apps.reports.models import Report, ReportImage


class ReportImageInline(admin.TabularInline):
    model = ReportImage
    extra = 0
    readonly_fields = ('id',)


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ('title', 'category', 'author', 'status', 'created_at')
    list_filter = ('status', 'category')
    search_fields = ('title', 'description')
    readonly_fields = ('id', 'h3_index', 'created_at', 'updated_at')
    inlines = [ReportImageInline]
