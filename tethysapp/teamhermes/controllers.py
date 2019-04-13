from django.shortcuts import render
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from .app import Teamhermes as app
from .model import Graphics


@login_required()
def home(request):
    """
    Controller for the app home page.
    """

    context = {

    }

    return render(request, 'teamhermes/home.html', context)


@login_required()
def proposal(request):
    """
    Controller for the app home page.
    """

    context = {

    }

    return render(request, 'teamhermes/proposal.html', context)


@login_required()
def mockup(request):
    """
    Controller for the app home page.
    """

    context = {

    }

    return render(request, 'teamhermes/mockup.html', context)


@login_required()
def router(request):
    """
    Controller for the app home page.
    """

    context = {

    }

    return render(request, 'teamhermes/router.html', context)


@login_required()
def saved_results(request):
    """
    Controller for the app home page.
    """

    current_user = request.user
    user_id = current_user.id

    Session = app.get_persistent_store_database('primary_db', as_sessionmaker=True)
    session = Session()
    num_graphics_user = session.query(Graphics).filter(Graphics.user_id == user_id)
    session.close()

    date_list = []
    for i, date in enumerate(num_graphics_user):
        date_list.append([date.time, date.id])

    context = {
        "date_list": date_list,
    }

    return render(request, 'teamhermes/saved_results.html', context)
