document.addEventListener('DOMContentLoaded', () => {

    var id1 = document.querySelector('#username').dataset.userId;

    const notificationSocket = new WebSocket(
        'ws://'
        + window.location.host
        + '/ws/notifications/'
    );

    document.querySelector(".nav-friends-container").addEventListener("click", (e) => {
        var target = e.target;

        if(target.classList.contains("close")) {
            username = target.parentNode;
            receiverID = username.dataset.friendId;
            userID = id1;

            notificationSocket.send(JSON.stringify({
                'action': "delete",
                'userID': userID,
                'receiverID': receiverID,
            }));
        }

        if(target.classList.contains("friend") || target.classList.contains("friend-name")) {
            target = target.closest(".friend");
            const id2 = target.dataset.friendId;

            if(id1 < id2){
                var roomName = id1 + "_" + id2;
            }else{
                var roomName = id2 + "_" + id1;
            }

            fetch(`/load`, {
                method: 'GET',
            })
            .then((response) => {
                if (response.ok) {
                    window.location.href = `/chat/${roomName}/`;
                }
            })
        }
    });
    
    element = document.querySelector('.nav-friends-container');
    option = document.querySelector('#options-button');
    user = document.querySelector('#username');
    chat = document.querySelector('.main-chat-container');
    optionsStyle = window.getComputedStyle(option);
    elementStyle = window.getComputedStyle(element);

    option.addEventListener("click", (e) => {
        e.stopPropagation();
        element.classList.add("show");
        user.classList.add("hide");
        element.classList.remove("hide");
        chat.classList.add("low-profile");

        document.addEventListener('click', hideFriends);
    });

    if(document.querySelector('.request-container')) {
        document.querySelector('.request-container').addEventListener('click', (e) => {
            var target = e.target;
    
            if(target.classList.contains("btn-accept")) {
                notificationSocket.send(JSON.stringify({
                    'action': "accept",
                    'to': target.dataset.userId,
                }));
            }
    
            if(target.classList.contains("btn-reject")) {
                notificationSocket.send(JSON.stringify({
                    'action': "reject",
                    'to': target.dataset.userId,
                }));
            }
        });
    
        friendInput = document.querySelector('#friend-request-input');
        if(friendInput) {
            friendInput.onkeyup = function(e) {
                if (e.keyCode === 13) {
                    document.querySelector('#request-send').click();
                }
            };
    
            document.querySelector('#request-send').onclick = function(e) {
                const messageInputDom = document.querySelector('#friend-request-input');
                const message = messageInputDom.value;
                notificationSocket.send(JSON.stringify({
                    'action': "send",
                    'to': message,
                    'from': id1,
                }));
                messageInputDom.value = '';
            };
        }
    }

    notificationSocket.onmessage = function(e) {
        const data = JSON.parse(e.data);
        
        if(data.action === "notification"){
            sender = document.querySelector(`#friend-${data.senderID}`)
            if(!sender.classList.contains("selected")) {
                sender = document.querySelector(`#friend-${data.senderID}`);
                friendsContainer = document.querySelector('.friends-container');
                
                sender.classList.add("notification");
                friendsContainer.removeChild(sender);
                
                restOfFriendsContainer = friendsContainer.innerHTML;
                friendsContainer.innerHTML = "";
                
                friendsContainer.appendChild(sender);
                friendsContainer.innerHTML += restOfFriendsContainer;
                
                simpleAnimation(data.senderID);
            }
        }

        if(data.action === "delete") {
            friendsContainer = document.querySelector('.friends-container');
            friendID = document.querySelector(`.nav-person`).dataset.friendId;
            if(data.senderID === id1) {
                deletedFriend = document.querySelector(`#friend-${data.receiverID}`);
                console.log(deletedFriend);
                friendsContainer.removeChild(deletedFriend);

                if(friendID === data.receiverID) {
                    window.location.replace(window.location.protocol + "//" + window.location.host);
                }

            } else {
                deletedFriend = document.querySelector(`#friend-${data.senderID}`);
                friendsContainer.removeChild(deletedFriend);

                if(friendID === data.senderID) {
                    window.location.replace(window.location.protocol + "//" + window.location.host);
                }
            }
        }

        if(data.action === "request") {
            requestsContainer = document.querySelector('.request-container');
            if(requestsContainer) {
                noRequestsMessage = requestsContainer.children[1];
                if(!noRequestsMessage.classList.contains("request-item")) {
                    requestsContainer.removeChild(requestsContainer.children[1]);
                }
    
                requestsContainer.innerHTML += `
                <div class="request-item" id="request-${data.senderID}">
                    <div style="width:98%; white-space:nowrap; text-overflow:ellipsis; overflow:hidden; max-width: 98%">${data.senderUsername}</div>
                    <div style="white-space:nowrap; margin-right: 15px">
                        <button class="btn btn-primary btn-accept fa-solid fa-check" data-user-id="${data.senderID}"></button>
                        <button class="btn btn-danger btn-reject fa-solid fa-xmark" data-user-id="${data.senderID}"></button>
                    </div>
                </div>`
            }

            requests = document.querySelector('.requests-number').innerHTML;
            requests = parseInt(requests , 10) + 1;
            document.querySelector('.requests-number').innerHTML = requests;
            document.querySelector('.requests-number').classList.remove("hide-requests");
        }

        if(data.action === "reject") {
            removeRequest(data.receiverID);
        }

        if(data.action === "accept") {
            if(data.senderID == id1) {
                removeRequest(data.receiverID);
                addFriendToList(data.receiverID, data.receiverUsername);
            }else {
                addFriendToList(data.senderID, data.senderUsername);
            }
        }
    };

});


function hideFriends(e) {
    var target = e.target;
    if(!target.classList.contains("friends-container") && !target.classList.contains("friends-title") && !target.classList.contains("close")) {
        if(optionsStyle.display === "block" && elementStyle.display === "block") {
            element.classList.remove("show");
            user.classList.remove("hide");
            chat.classList.remove("low-profile");
            element.classList.add("hide");
            this.removeEventListener("click", hideFriends);
        }
    }
}

function simpleAnimation(senderID) {
    setTimeout(() => {
        document.querySelector(`#friend-${senderID}`).classList.remove("notification");
    }, 1000);
}

function removeRequest(receiverID) {
    document.querySelector(`#request-${receiverID}`).remove();
    requests = document.querySelector('.requests-number').innerHTML;
    requests = parseInt(requests , 10) - 1;
    document.querySelector('.requests-number').innerHTML = requests;

    if(requests === 0) {
        document.querySelector('.requests-number').classList.add("hide-requests");
        document.querySelector('.request-container').innerHTML += `
        <div style="display:flex; align-items:center; justify-content:center">
            <div>No incoming requests</div>
        </div>`
    }
}

function addFriendToList(friendID, friendUsername) {
    friendList = document.querySelector('.friends-container').innerHTML;
    document.querySelector('.friends-container').innerHTML = '';
    document.querySelector('.friends-container').innerHTML = `
    <button class="friend" id="friend-${friendID}" data-friend-id=${friendID}>
        <div class="friend-name">${friendUsername}</div>
        <div class="close">&#x2715</div>
    </button>`;
    document.querySelector('.friends-container').innerHTML += friendList;
}