from django.shortcuts import render
from django.contrib.auth import authenticate, login, logout
from django.http import HttpResponseRedirect, JsonResponse
from django.db import IntegrityError
from django.urls import reverse
from .models import *

import json

# Create your views here.

# api end points
def load(request):
    if not request.user.is_authenticated:
        return render(request, "chat/login.html")

    return JsonResponse({}, status=201)


def message(request, messageID):
    if request.method != "GET":
        return JsonResponse({}, status=405)
    
    if not request.user.is_authenticated:
        return JsonResponse({}, status=401)
    
    message = Message.objects.get(pk=int(messageID))

    if request.user not in message.chat.participants.all():
        return JsonResponse({}, status=401)

    return JsonResponse({"message": message.seralize()}, status=201)

# website views 
def index(request):
    if not request.user.is_authenticated:
        return render(request, "chat/login.html")

    user = request.user
    chats = Chat.objects.filter(participants=user).order_by('-last_modified')

    participants = []
    for chat in chats:
        participants.extend(chat.participants.all().exclude(pk=user.pk))

    friend_requests = FriendRequest.objects.filter(receiver=user)

    requests_count = FriendRequest.objects.filter(receiver=user).count()
    
    return render(request, "chat/index.html", {
        "friends": participants,
        "requests": friend_requests,
        "requests_count": requests_count,
    })


def room(request, room_name):
    if not request.user.is_authenticated:
        return render(request, "chat/login.html")

    user = request.user
    chats = Chat.objects.filter(participants=user).order_by('-last_modified')

    participants = []
    for chat in chats:
        participants.extend(chat.participants.all().exclude(pk=user.pk))

    room_name = room_name.split("_")
    active_user_id = room_name[0]

    if int(active_user_id) == user.id:
        active_user_id = room_name[1]


    active_user = User.objects.get(id=active_user_id)

    chat = Chat.objects.filter(participants__in=[user]).filter(participants__in=[active_user])

    messages = chat[0].messages.all()

    requests_count = FriendRequest.objects.filter(receiver=user).count()

    return render(request, "chat/index.html", {
        "friends": participants,
        "active_user": active_user,
        "messages": messages,
        "requests_count": requests_count,
    })


def login_view(request):
    if request.method == "POST":

        # Attempt to sign user in
        username = request.POST["username"]
        password = request.POST["password"]
        user = authenticate(request, username=username, password=password)

        # Check if authentication successful
        if user is not None:
            login(request, user)
            return HttpResponseRedirect(reverse("index"))
        else:
            return render(request, "chat/login.html", {
                "message": "Invalid username and/or password."
            })
    else:
        return render(request, "chat/login.html")


def logout_view(request):
    logout(request)
    return HttpResponseRedirect(reverse("index"))


def register(request):
    if request.method == "POST":
        username = request.POST["username"]
        email = request.POST["email"]

        # Ensure password matches confirmation
        password = request.POST["password"]
        confirmation = request.POST["confirmation"]
        if password != confirmation:
            return render(request, "chat/register.html", {
                "message": "Passwords must match."
            })

        # Attempt to create new user
        try:
            user = User.objects.create_user(username, email, password)
            user.save()
        except IntegrityError:
            return render(request, "chat/register.html", {
                "message": "Username already taken."
            })
        login(request, user)
        return HttpResponseRedirect(reverse("index"))
    else:
        return render(request, "chat/register.html")