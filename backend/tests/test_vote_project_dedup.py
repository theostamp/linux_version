import datetime
from decimal import Decimal

import pytest

from assemblies.models import Assembly, AgendaItem
from projects.models import Project
from votes.models import Vote
from tests.factories import BuildingFactory


@pytest.mark.django_db
def test_agenda_item_reuses_existing_project_vote():
    building = BuildingFactory()
    creator = building.manager

    today = datetime.date.today()
    scheduled_date = today + datetime.timedelta(days=7)

    project = Project.objects.create(
        building=building,
        title="Αντικατάσταση Πλακιδίων Εισόδου",
        description="Περιγραφή έργου",
        created_by=creator,
        general_assembly_date=scheduled_date,
    )

    project_vote = Vote.objects.get(project=project)
    assert Vote.objects.filter(project=project).count() == 1

    assembly = Assembly.objects.create(
        building=building,
        title="Γενική Συνέλευση",
        scheduled_date=scheduled_date,
        scheduled_time=datetime.time(19, 30),
        created_by=creator,
        required_quorum_percentage=Decimal("66.67"),
        pre_voting_start_date=today + datetime.timedelta(days=1),
    )

    agenda_item = AgendaItem.objects.create(
        assembly=assembly,
        order=1,
        title=f"Έγκριση έργου: {project.title}",
        item_type="voting",
        linked_project=project,
    )

    agenda_item.refresh_from_db()
    project_vote.refresh_from_db()

    assert Vote.objects.filter(project=project).count() == 1
    assert agenda_item.linked_vote_id == project_vote.id

    # Existing project vote is extended to cover the assembly voting window.
    assert project_vote.end_date == scheduled_date + datetime.timedelta(days=3)
    assert project_vote.min_participation == 66


@pytest.mark.django_db
def test_agenda_item_creates_vote_with_project_when_missing():
    building = BuildingFactory()
    creator = building.manager

    today = datetime.date.today()
    scheduled_date = today + datetime.timedelta(days=7)

    project = Project.objects.create(
        building=building,
        title="Αντικατάσταση Πλακιδίων Εισόδου",
        description="Περιγραφή έργου",
        created_by=creator,
        general_assembly_date=scheduled_date,
    )

    # Simulate a project with no existing Vote (e.g., legacy data cleanup or manual deletion).
    Vote.objects.filter(project=project).delete()
    assert Vote.objects.filter(project=project).count() == 0

    assembly = Assembly.objects.create(
        building=building,
        title="Γενική Συνέλευση",
        scheduled_date=scheduled_date,
        scheduled_time=datetime.time(19, 30),
        created_by=creator,
    )

    agenda_item = AgendaItem.objects.create(
        assembly=assembly,
        order=1,
        title=f"Έγκριση έργου: {project.title}",
        item_type="voting",
        linked_project=project,
    )

    agenda_item.refresh_from_db()
    assert agenda_item.linked_vote is not None
    assert agenda_item.linked_vote.project_id == project.id
