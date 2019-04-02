from django.shortcuts import render
from django.contrib.auth.decorators import login_required


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
