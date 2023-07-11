# chat/consumers.py
import json

from asgiref.sync import async_to_sync
from channels.generic.websocket import WebsocketConsumer
from channels.layers import get_channel_layer
from .models import *


class UserConsumer(WebsocketConsumer):
    def connect(self):
        user = self.scope["user"]
        self.room_name = user.id
        self.room_group_name = "user_%s" % self.room_name

        # Join room group
        async_to_sync(self.channel_layer.group_add)(
            self.room_group_name, self.channel_name
        )

        self.accept()

    def disconnect(self, close_code):
        # Leave room group
        async_to_sync(self.channel_layer.group_discard)(
            self.room_group_name, self.channel_name
        )

    def receive(self, text_data):
        text_data_json = json.loads(text_data)
        action = text_data_json["action"]

        if action == "delete":
            userID = text_data_json["userID"]
            receiverID = text_data_json["receiverID"]

            try:
                sender = User.objects.get(pk=int(userID))
                reciever = User.objects.get(pk=int(receiverID))
                chat = Chat.objects.filter(participants__in=[sender]).filter(participants__in=[reciever])
                chat.delete()

                channel_layer = get_channel_layer()
                room_group_name = f"user_{receiverID}"

                async_to_sync(channel_layer.group_send)(
                    room_group_name, {
                        'type': 'notification_delete',
                        'senderID': userID,
                        'receiverID': receiverID,
                    }
                )

                async_to_sync(self.channel_layer.group_send)(
                    self.room_group_name, {
                        'type': 'notification_delete',
                        'senderID': userID,
                        'receiverID': receiverID,
                    }
                )
            except:
                return
            
        if action == "send":
            user = self.scope["user"]
            to = text_data_json["to"]

            try:
                receiver = User.objects.get(username=to)
            except:
                return
            
            if FriendRequest.objects.filter(sender=user, receiver=receiver).count() > 0 or FriendRequest.objects.filter(sender=receiver, receiver=user).count() > 0:
                return

            if user == receiver:
                return
            
            chats = receiver.chats.all()
            participants = User.objects.filter(chats__in=chats).distinct()
            if user in participants:
                return
        
            friend_request = FriendRequest(sender=user, receiver=receiver)
            friend_request.save()

            channel_layer = get_channel_layer()
            room_group_name = f"user_{receiver.id}"

            async_to_sync(channel_layer.group_send)(
                room_group_name, {
                    'type': 'notification_friend_request',
                    'senderID': user.id,
                    'senderUsername': user.username,
                }
            )
        
        if action == "accept":
            user = self.scope["user"]
            to = text_data_json["to"]

            try:
                receiver = User.objects.get(pk=int(to))
            except:
                return
            
            try:
                friend_request = FriendRequest.objects.get(sender=receiver, receiver=user)
            except:
                return
            
            friend_request.delete()
            chat = Chat()
            chat.save()
            chat.participants.add(user)
            chat.participants.add(receiver)

            channel_layer = get_channel_layer()
            room_group_name = f"user_{receiver.id}"

            async_to_sync(channel_layer.group_send)(
                room_group_name, {
                    'type': 'notification_request_accepted',
                    'senderID': user.id,
                    'receiverID': receiver.id,
                    'senderUsername': user.username,
                    'receiverUsername': receiver.username,
                }
            )

            async_to_sync(self.channel_layer.group_send)(
                self.room_group_name, {
                    'type': 'notification_request_accepted',
                    'senderID': user.id,
                    'receiverID': receiver.id,
                    'senderUsername': user.username,
                    'receiverUsername': receiver.username,
                }
            )

        if action == "reject":
            user = self.scope["user"]
            to = text_data_json["to"]

            try:
                receiver = User.objects.get(pk=int(to))
            except:
                return

            try:
                friend_request = FriendRequest.objects.get(sender=receiver, receiver=user)
                friend_request.delete()
            except:
                return

            async_to_sync(self.channel_layer.group_send)(
                self.room_group_name, {
                    'type': 'notification_request_rejected',
                    'receiverID': receiver.id,
                }
            )

    def notification_message(self, event):
        senderID = event["senderID"]
        self.send(text_data=json.dumps({"action": "notification", "senderID": senderID}))

    def notification_delete(self, event):
        senderID = event["senderID"]
        receiverID = event["receiverID"]
        self.send(text_data=json.dumps({"action": "delete", "senderID":senderID, "receiverID":receiverID}))

    def notification_friend_request(self, event):
        senderID = event["senderID"]
        senderUsername = event["senderUsername"]
        self.send(text_data=json.dumps({"action": "request", "senderID": senderID, "senderUsername":senderUsername}))

    def notification_request_rejected(self, event):
        receiverID = event["receiverID"]
        self.send(text_data=json.dumps({"action": "reject", "receiverID": receiverID}))

    def notification_request_accepted(self, event):
        senderID = event["senderID"]
        receiverID = event["receiverID"]
        senderUsername = event["senderUsername"]
        receieverUsername = event["receiverUsername"]
        self.send(text_data=json.dumps({
            "action": "accept",
            "senderID": senderID, 
            "senderUsername":senderUsername, 
            "receiverID": receiverID,
            "receiverUsername": receieverUsername,
        }))



class ChatConsumer(WebsocketConsumer):
    def connect(self):
        self.room_name = self.scope["url_route"]["kwargs"]["room_name"]
        self.room_group_name = "chat_%s" % self.room_name

        # Join room group
        async_to_sync(self.channel_layer.group_add)(
            self.room_group_name, self.channel_name
        )

        self.accept()

    def disconnect(self, close_code):
        # Leave room group
        async_to_sync(self.channel_layer.group_discard)(
            self.room_group_name, self.channel_name
        )

    # Receive message from WebSocket
    def receive(self, text_data):
        text_data_json = json.loads(text_data)
        action = text_data_json["action"]

        if action == "send":
            message = text_data_json["message"]
            senderID = text_data_json["from"]
            recieverID = text_data_json["to"]

            if message == "":
                return

            sender = User.objects.get(pk=int(senderID))
            reciever = User.objects.get(pk=int(recieverID))
            
            chat = Chat.objects.filter(participants__in=[sender]).filter(participants__in=[reciever])

            messageObject = Message()
            messageObject.chat = chat[0]
            messageObject.sender = sender
            messageObject.content = message

            messageObject.save()
            chat[0].save()

            timeStamp = messageObject.timestamp.strftime("%b %d %Y, %I:%M %p")

            channel_layer = get_channel_layer()
            room_group_name = f"user_{recieverID}"

            async_to_sync(channel_layer.group_send)(
                room_group_name, {
                    'type': 'notification_message',
                    'senderID': senderID,
                }
            )

            # Send message to room group
            async_to_sync(self.channel_layer.group_send)(
                self.room_group_name, {
                    "type": "chat_message", 
                    "message": message, 
                    "messageID": messageObject.id, 
                    "senderID":senderID, 
                    "senderUsername":sender.username, 
                    "messageTime": timeStamp
                }
            )

        if action == "edit":
            messageID = text_data_json["messageID"]
            new_content = text_data_json["content"]

            if new_content == "":
                return

            message = Message.objects.get(pk=int(messageID))
            message.content = new_content
            message.save()

            async_to_sync(self.channel_layer.group_send)(
                self.room_group_name, {"type": "update_message", "messageID": message.id, "senderID":message.sender.id})

        if action == "delete":
            messageID = text_data_json["messageID"]
            try:
                message = Message.objects.get(pk=messageID)
                message.delete()
            except:
                return

            async_to_sync(self.channel_layer.group_send)(
                self.room_group_name, {"type": "delete_message", "messageID": messageID})

    # Receive message from room group
    def chat_message(self, event):
        message = event["message"]
        senderID = event["senderID"]
        senderUsername = event["senderUsername"]
        timeStamp = event["messageTime"]
        messageID = event["messageID"]

        # Send message to WebSocket
        self.send(text_data=json.dumps({
            "message": message, 
            "senderID": senderID, 
            "senderUsername": senderUsername, 
            "timeStamp": timeStamp, 
            "messageID": messageID,
            "action": "send"}))


    def update_message(self, event):
        messageID = event["messageID"]
        senderID = event["senderID"]
        self.send(text_data=json.dumps({"messageID":messageID, "action": "edit", "senderID":senderID}))

    def delete_message(self, event):
        messageID = event["messageID"]
        self.send(text_data=json.dumps({"messageID":messageID, "action": "delete"}))