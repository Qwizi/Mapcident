from django.contrib import admin
from apps.categories.models import Category, CategoryGroup


class CategoryInline(admin.TabularInline):
    model = Category
    extra = 0
    fields = ('name', 'slug', 'icon', 'color', 'order')
    prepopulated_fields = {'slug': ('name',)}
    ordering = ('order', 'name')


@admin.register(CategoryGroup)
class CategoryGroupAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'icon', 'color', 'order', 'created_at')
    search_fields = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}
    inlines = [CategoryInline]


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'group', 'slug', 'icon', 'color', 'order', 'created_at')
    list_filter = ('group',)
    search_fields = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}
