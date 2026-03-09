from typing import List
from django.shortcuts import get_object_or_404
from ninja_extra import api_controller, route
from ninja_extra.permissions import IsAuthenticated, IsAdminUser

from apps.categories.models import Category
from apps.categories.schemas import CategoryInSchema, CategoryOutSchema


@api_controller('/categories', tags=['Categories'])
class CategoryController:

    @route.get('/', response=List[CategoryOutSchema], auth=None)
    def list_categories(self):
        return list(Category.objects.all())

    @route.post('/', response=CategoryOutSchema, permissions=[IsAuthenticated, IsAdminUser])
    def create_category(self, payload: CategoryInSchema):
        return Category.objects.create(**payload.dict())

    @route.put('/{category_id}', response=CategoryOutSchema, permissions=[IsAuthenticated, IsAdminUser])
    def update_category(self, category_id: str, payload: CategoryInSchema):
        category = get_object_or_404(Category, id=category_id)
        for attr, value in payload.dict().items():
            setattr(category, attr, value)
        category.save()
        return category

    @route.delete('/{category_id}', permissions=[IsAuthenticated, IsAdminUser])
    def delete_category(self, category_id: str):
        category = get_object_or_404(Category, id=category_id)
        category.delete()
        return {'success': True}

