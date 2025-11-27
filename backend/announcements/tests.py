from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from users.models import User
from buildings.models import Building
from .models import Announcement

class AnnouncementViewSetTests(APITestCase):
    def setUp(self):
        self.superuser = User.objects.create_superuser('admin', 'admin@example.com', 'password')
        self.building = Building.objects.create(name='Test Building')
        self.announcement = Announcement.objects.create(
            title='Test Announcement',
            content='Test Content',
            building=self.building,
            author=self.superuser
        )
        self.client.force_authenticate(user=self.superuser)

    def test_delete_announcement(self):
        """
        Ensure an announcement can be deleted and a confirmation message is returned.
        """
        url = reverse('announcement-detail', kwargs={'pk': self.announcement.pk})
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Announcement.objects.count(), 0)

        expected_message = f"Η ανακοίνωση '{self.announcement.title}' διαγράφηκε επιτυχώς από το κτίριο '{self.building.name}'."
        self.assertEqual(response.data['message'], expected_message)

    def test_delete_global_announcement(self):
        """
        Ensure a global announcement can be deleted and a confirmation message is returned.
        """
        global_announcement = Announcement.objects.create(
            title='Global Announcement',
            content='Global Content',
            author=self.superuser
        )
        url = reverse('announcement-detail', kwargs={'pk': global_announcement.pk})
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # There's still one announcement left (the non-global one)
        self.assertEqual(Announcement.objects.count(), 1)
        self.assertFalse(Announcement.objects.filter(pk=global_announcement.pk).exists())


        expected_message = f"Η καθολική ανακοίνωση '{global_announcement.title}' διαγράφηκε επιτυχώς από όλα τα κτίρια."
        self.assertEqual(response.data['message'], expected_message)