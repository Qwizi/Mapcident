from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.urls import path
from ninja_extra import NinjaExtraAPI
from ninja_jwt.controller import NinjaJWTDefaultController

from apps.users.views import AuthController
from apps.categories.views import CategoryController, CategoryGroupController
from apps.reports.views import ReportController
from apps.comments.views import CommentController

api = NinjaExtraAPI(title='MapCident API', version='1.0.0')
api.register_controllers(
    NinjaJWTDefaultController,
    AuthController,
    CategoryController,
    CategoryGroupController,
    ReportController,
    CommentController,
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/', api.urls),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
