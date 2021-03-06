from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from .model import store_graphics, Graphics
import json
import datetime
from .app import Teamhermes as app
import traceback
from pprint import pprint


@login_required()
def save_graphics_layer(request):
    current_user = request.user
    user_id = current_user.id

    json_body = json.loads(request.body.decode('utf-8'))

    for layer in json_body["results"]:
        if "x" in layer["geometry"].keys():
            layer["layerType"] = "point"
        else:
            layer["layerType"] = "polyline"

    if json_body["blockage"]:
        json_body["results"][-1]["isBlockage"] = True

    Session = app.get_persistent_store_database('primary_db', as_sessionmaker=True)
    session = Session()
    num_graphics_user = session.query(Graphics).filter(Graphics.user_id == user_id).count()
    session.close()

    if num_graphics_user <= 10:
        store_graphics(json_body["results"], user_id, datetime.datetime.now())
        return JsonResponse({"status": "success"})
    else:
        return JsonResponse({"status": "fail", "error_message": "Users has reached limit for saved analyses."})


@login_required()
def retrieve_data(request):
    try:
        data = json.loads(request.body)

        if data["type"] == "dates":
            current_user = request.user
            user_id = current_user.id

            Session = app.get_persistent_store_database('primary_db', as_sessionmaker=True)
            session = Session()
            num_graphics_user = session.query(Graphics).filter(Graphics.user_id == user_id)
            session.close()

            date_dict = {}
            for i, date in enumerate(num_graphics_user):
                date_dict[i] = date.time

            return JsonResponse(date_dict)

        if data["type"] == "graphics":

            table_id = data["id"]
            print(table_id)
            Session = app.get_persistent_store_database('primary_db', as_sessionmaker=True)
            session = Session()
            graphics_query = session.query(Graphics).filter(Graphics.id == table_id)
            session.close()

            resp_dict = {
                "graphics": graphics_query[0].graphics
            }

            # TODO: Check to see if only one response (should be)
            return JsonResponse(resp_dict)

    except Exception:
        traceback.print_exc()
