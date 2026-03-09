from django.contrib import admin
from apps.comments.models import Comment


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ('author', 'report', 'created_at')
    search_fields = ('content', 'author__email')
    readonly_fields = ('id', 'created_at', 'updated_at')
