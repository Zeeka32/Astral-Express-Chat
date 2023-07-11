from django.db import models
from django.contrib.auth.models import AbstractUser

# Create your models here.
class User(AbstractUser):
    def seralize(self):
        return {
            'id': self.id,
            'username': self.username
        }

class Chat(models.Model):
    participants = models.ManyToManyField(User, related_name='chats')
    last_modified = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-last_modified']

    def seralize(self):
        return {
            'id': self.id,
            'participants': [user.username for user in self.participants.all()]
        }

class Message(models.Model):
    content = models.TextField()
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    chat = models.ForeignKey(Chat, on_delete=models.CASCADE, related_name='messages')
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__ (self):
        return self.content
    
    def seralize(self):
        return {
            'id': self.id,
            'sender': self.sender.username,
            'content': self.content,
            'timestamp': self.timestamp.strftime("%b %d %Y, %I:%M %p")
        }
    
class FriendRequest(models.Model):
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_requests')
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_requests')
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__ (self):
        return f"{self.sender.username} sent a friend request to {self.receiver.username}"
    
    def seralize(self):
        return {
            'id': self.id,
            'sender': self.sender.username,
            'receiver': self.receiver.username,
            'timestamp': self.timestamp.strftime("%b %d %Y, %I:%M %p")
        }