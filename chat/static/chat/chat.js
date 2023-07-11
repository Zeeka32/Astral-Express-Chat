document.addEventListener('DOMContentLoaded', () => {

    const id1 = document.querySelector('#username').dataset.userId;
    const id2 = document.querySelector('#friend-data').dataset.friendId;

    if(id1 < id2){
        var roomName = id1 + "_" + id2;
    }else{
        var roomName = id2 + "_" + id1;
    }

    const chatSocket = new WebSocket(
        'ws://'
        + window.location.host
        + '/ws/chat/'
        + roomName
        + '/'
    );

    chatSocket.onclose = function(e) {
        console.error('Chat socket closed unexpectedly');
    };

    document.querySelector('#chat-input-textbox').focus();
    document.querySelector('#chat-input-textbox').onkeyup = function(e) {
        if (e.keyCode === 13) {
            document.querySelector('#send-btn').click();
        }
    };

    document.querySelector(".message-container").addEventListener("click", function(event) {
        var target = event.target;
        
        // Check if the clicked element is the edit button
        if (target.classList.contains("edit-button")) {
            // Handle the edit button click
            handleEditButtonClick(target);
        }
        
        // Check if the clicked element is the delete button
        if (target.classList.contains("delete-btn")) {
            // Handle the delete button click
            handleDeleteButtonClick(target);
        }

        if(target.classList.contains("save-btn")) {
            handleSaveButtonClick(target)
        }

        if(target.classList.contains("cancel-btn")) {
            handleCancelButtonClick(target)
        }
    });
      
      
    function handleEditButtonClick(button) {
        const contentToBeEdited = document.querySelector(`#message-${button.dataset.messageId}-content`)
        const oldText = contentToBeEdited.textContent;

        deleteButton = button.closest(".message-actions").children[1]
        saveButton = button.closest(".message-actions").children[2]
        cancelButton = button.closest(".message-actions").children[3]

        contentToBeEdited.innerHTML = `<textarea class="chat-input chat-edit" rows=1 id="textarea-${button.dataset.messageId}" style="margin:0; width:100%">${oldText}</textarea>`
        button.style.display = "none";
        deleteButton.style.display = "none";
        saveButton.style.setProperty("display", "inline", "important");
        cancelButton.style.setProperty("display", "inline", "important");

    }
    
    function handleDeleteButtonClick(button) {
        const messageID = button.dataset.messageId;
        chatSocket.send(JSON.stringify({
            'action': "delete",
            'messageID': messageID,
        }));
    }

    function handleSaveButtonClick(button) {
        const newContent = document.querySelector(`#textarea-${button.dataset.messageId}`).value
        console.log(newContent)
        chatSocket.send(JSON.stringify({
            'action':'edit',
            'messageID': button.dataset.messageId,
            'content': newContent,
        }));
    }

    function handleCancelButtonClick(button) {
        editButton = button.closest(".message-actions").children[0]
        deleteButton = button.closest(".message-actions").children[1]
        saveButton = button.closest(".message-actions").children[2]

        fetch(`/message/${button.dataset.messageId}`, {
            method: "GET"
        })
        .then((response) => response.json())
        .then((response) => {
            deleteButton.style.display = "inline";
            editButton.style.display = "inline";
            saveButton.style.display = "none";
            button.style.display = "none";

            const content = document.querySelector(`#message-${button.dataset.messageId}-content`)

            content.innerHTML = response.message.content;
        })
    }

    function updateRecieverChat(message, messageID) {
        fetch(`/message/${messageID}`, {
            method: "GET"
        })
        .then((response) => response.json())
        .then((response) => {
            message.innerHTML = response.message.content;
        })
    }

    document.querySelector('#send-btn').onclick = function(e) {
        const messageInputDom = document.querySelector('#chat-input-textbox');
        const message = messageInputDom.value;
        chatSocket.send(JSON.stringify({
            'action': "send",
            'message': message,
            'from': id1,
            'to': id2,
        }));
        messageInputDom.value = '';
    };

    chatSocket.onmessage = function(e) {
        const data = JSON.parse(e.data);

        if (data.action === "send") {
            updateDOMonSend(data, id1);
            const mesesageContainer = document.querySelector('.message-container');
            mesesageContainer.scrollTop = mesesageContainer.scrollHeight;
            
            selectedChat = document.querySelector('.selected');
            friendsContainer = document.querySelector('.friends-container');

            friendsContainer.removeChild(selectedChat);

            restOfFriendsContainer = friendsContainer.innerHTML;
            friendsContainer.innerHTML = "";

            friendsContainer.appendChild(selectedChat);
            friendsContainer.innerHTML += restOfFriendsContainer;

        }else if (data.action === "delete") {
            updateDOMonDelete(data);
        }else if (data.action === "edit") {
            if(data.senderID == id1) {
                button = document.querySelector(`#message-${data.messageID}`).children[1].children[1].children[3]
                handleCancelButtonClick(button);
            }else {
                message = document.querySelector(`#message-${data.messageID}-content`);
                updateRecieverChat(message, data.messageID);
            }
        }
        
    };

    const mesesageContainer = document.querySelector('.message-container');
    mesesageContainer.scrollTop = mesesageContainer.scrollHeight;
});

function updateDOMonSend(data, id1) {
    if(data.senderID === id1) {
        document.querySelector(".message-container").innerHTML += `
        <div class="message" id="message-${data.messageID}">
            <div class="message-sender">
                <div>${data.senderUsername}</div>
                <div class="text-muted message-time">${data.timeStamp}</div>
            </div>
            <div class="message-content">
                <div id="message-${data.messageID}-content" class="message-content-text">${data.message}</div>
                <div class="message-actions">
                    <button class="edit-button btn btn-primary fa-solid fa-pen" data-message-id=${data.messageID}></button>
                    <button class="delete-btn btn btn-primary fa-solid fa-trash-can" data-message-id=${data.messageID}></button>
                    <button class="fa-solid fa-check save-btn btn btn-primary" data-message-id=${data.messageID}></button>
                    <button class="cancel-btn btn btn-primary fa-solid fa-xmark" data-message-id=${data.messageID}></button>
                </div>
            </div>
        </div>`;
    } else {
        document.querySelector(".message-container").innerHTML += `
        <div class="message" id="message-${data.messageID}">
            <div class="message-sender">
                <div>${data.senderUsername}</div>
                <div class="text-muted message-time">${data.timeStamp}</div>
            </div>
            <div class="message-content">
                <div id="message-${data.messageID}-content" class="message-content-text">${data.message}</div>
            </div>
        </div>`;
    }
}

function updateDOMonDelete(data) {
    const messageToBeDeleted = document.querySelector(`#message-${data.messageID}`);
    messageToBeDeleted.remove();
}