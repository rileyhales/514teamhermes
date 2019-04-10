from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from .model import store_graphics, Graphics
import json
import datetime
from .app import Teamhermes as app


@login_required()
def save_graphics_layer(request):
    current_user = request.user
    user_id = current_user.id

    json_body = json.loads(request.body.decode('utf-8'))

    Session = app.get_persistent_store_database('primary_db', as_sessionmaker=True)
    session = Session()
    num_graphics_user = session.query(Graphics).filter(Graphics.user_id == user_id).count()
    session.close()

    if num_graphics_user <= 10:
        store_graphics(json_body, user_id, datetime.datetime.now())
        return JsonResponse({"status": "success"})
    else:
        return JsonResponse({"status": "fail", "error_message": "Users has reached limit for saved analyses."})
