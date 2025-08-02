import factory
from django.contrib.auth import get_user_model  
      # type: ignore
from buildings.models import Building
from user_requests.models import UserRequest
from announcements.models import Announcement

User = get_user_model()

class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User

    email = factory.Sequence(lambda n: f"user{n}@example.com")
    first_name = "Test"
    last_name = "User"
    password = factory.PostGenerationMethodCall("set_password", "testpassword")


class BuildingFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Building

    name = factory.Sequence(lambda n: f"Building {n}")
    address = "Test Address"
    manager = factory.SubFactory(UserFactory)  # ✅ required


class UserRequestFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = UserRequest

    title = factory.Sequence(lambda n: f"Aίτημα {n}")
    description = "Περιγραφή αιτήματος"
    created_by = factory.SubFactory(UserFactory)
    building = factory.SubFactory(BuildingFactory)
    type = "technical"  # ή type = ""   
    status = "pending"  # ή status = ""
    supporters = factory.RelatedFactoryList(
        UserFactory,
        factory_related_name="supported_requests",
        size=3
    )   




class AnnouncementFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Announcement

    title = factory.Sequence(lambda n: f"Ανακοίνωση {n}")
    description = "Περιγραφή ανακοίνωσης"
    start_date = "2025-05-01"
    end_date = "2025-05-31"
    published = True
    created_by = factory.SubFactory(UserFactory)
    building = factory.SubFactory(BuildingFactory)
