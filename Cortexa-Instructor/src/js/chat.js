import { supaClient } from "./main.js";
import { getInstructorName } from "./main.js";

// Get instructor ID from session storage
const instructorId = sessionStorage.getItem("instructorId");

// UI Elements
const chatName = document.querySelector(".chat__name");
const chats = document.querySelector(".chats");
const collapseButton = document.querySelector(".collapse__chat-btn");
const chatView = document.querySelector(".chat__view");
const chatListContainer = document.querySelector(".chats__list");
const chatImgEl = document.querySelector(".chat__img img");

// Chat state variables
let currentChatId = null;
let subscription = null;
let processedMessageIds = new Set();
let userNameCache = new Map();
let userChats = [];
let chatSubscriptions = {};

// Connection state tracking
let isConnected = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_INTERVAL = 3000;

// Prefetch and cache the current instructor's name
if (instructorId) {
  getInstructorName(instructorId)
    .then((name) => {
      userNameCache.set(instructorId, name);
    })
    .catch(() => {
      userNameCache.set(instructorId, "Unknown Instructor");
    });
}

// Function to handle opening a chat if redirected from courses page
async function openIfClickedFromCourse() {
  const courseId = JSON.parse(sessionStorage.getItem("courseId"));
  if (courseId && isUserComingFrom("courses.html")) {
    const chatName = await getCourseName(courseId);
    openChatByName(chatName);
    sessionStorage.setItem("courseId", null);
  }
}

// Helper function to check if user is coming from a specific page
function isUserComingFrom(page) {
  return document.referrer.includes(page);
}

// Get course name from course ID
async function getCourseName(courseId) {
  try {
    const { data, error } = await supaClient
      .from("course")
      .select("course_name")
      .eq("course_id", courseId)
      .single();

    if (error) throw error;
    return data.course_name;
  } catch (error) {
    console.error("Error getting course name:", error);
    return "Unknown Course";
  }
}

// Function to open a chat by name
async function openChatByName(name) {
  try {
    const chatItem = document.querySelector(
      `.chat__item[data-chat-name="${name}"]`
    );
    if (chatItem) {
      chatItem.click();
    }
  } catch (error) {
    console.error("Error opening chat by name:", error);
  }
}

// Check if we need to open a specific chat
openIfClickedFromCourse();

// Chat search functionality
document.addEventListener("DOMContentLoaded", function () {
  const searchInput = document.querySelector(".chats__search");
  const chatsList = document.querySelector(".chats__list");

  // Function to handle search
  function handleSearch(event) {
    const searchTerm = event.target.value.toLowerCase().trim();
    const chatItems = document.querySelectorAll(".chat__item");

    if (chatItems.length === 0) {
      // No chat items loaded yet
      return;
    }

    // Show all chats if search term is empty
    if (searchTerm === "") {
      chatItems.forEach((item) => {
        item.style.display = "flex";
      });
      return;
    }

    // Filter chats based on search term
    chatItems.forEach((item) => {
      const chatName = item
        .querySelector(".chat__name")
        .textContent.toLowerCase();

      // If chat preview text exists, include it in the search
      const chatPreview = item.querySelector(".chat__preview")
        ? item.querySelector(".chat__preview").textContent.toLowerCase()
        : "";

      if (chatName.includes(searchTerm) || chatPreview.includes(searchTerm)) {
        item.style.display = "flex";
      } else {
        item.style.display = "none";
      }
    });
  }

  // Add event listener for search input
  if (searchInput) {
    searchInput.addEventListener("input", handleSearch);
    // Add clear search functionality
    searchInput.addEventListener("search", function () {
      handleSearch({ target: searchInput });
    });
  }

  // Add custom clear button for search
  const inputGroup = searchInput?.closest(".input__group");
  if (inputGroup) {
    // Create custom clear button
    const clearButton = document.createElement("button");
    clearButton.className = "search__clear-btn";
    clearButton.innerHTML = "×";
    clearButton.style.display = "none"; // Hide initially

    // Insert the button into the DOM
    inputGroup.appendChild(clearButton);

    // Style the button with inline styles
    Object.assign(clearButton.style, {
      position: "absolute",
      right: "6rem",
      background: "none",
      border: "none",
      fontSize: "2.8rem",
      cursor: "pointer",
      color: "#999aaa",
    });

    // Show/hide the clear button based on input content
    searchInput.addEventListener("input", function () {
      clearButton.style.display = this.value ? "block" : "none";
    });

    // Clear the input when button is clicked
    clearButton.addEventListener("click", function () {
      searchInput.value = "";
      clearButton.style.display = "none";
      searchInput.focus();

      // Trigger the search event to update results
      const event = new Event("input");
      searchInput.dispatchEvent(event);
    });
  }
});
async function safeGetUserName(userId) {
  if (!userId) {
    return "Unknown User";
  }

  // Check cache first for performance
  if (userNameCache.has(userId)) {
    return userNameCache.get(userId);
  }

  try {
    // If current user, just label as "You" but don't cache it that way
    if (Number(userId) === Number(instructorId)) {
      const name = await getInstructorName(instructorId);
      userNameCache.set(userId, name || "Unknown Instructor");
      return "You";
    }

    // Try student table first
    try {
      const studentName = await getStudentName(userId);
      if (studentName) {
        userNameCache.set(userId, studentName);
        return studentName;
      }
    } catch (e) {
      console.log(`User ${userId} not found in student table, trying instructor table`);
    }

    // If not a student, try instructor table
    try {
      const name = await getInstructorName(userId);
      if (name) {
        userNameCache.set(userId, name);
        return name;
      }
    } catch (e) {
      console.log(`User ${userId} not found in instructor table either`);
    }

    // If we got here, we couldn't find the user
    userNameCache.set(userId, "Unknown User");
    return "Unknown User";
  } catch (error) {
    console.error(`Error getting username for ID ${userId}:`, error);
    userNameCache.set(userId, "Unknown User");
    return "Unknown User";
  }
}
// Functions to handle opening and closing chats
function openChat() {
  chats.classList.add("open");
  chatView.classList.add("active");
}

function closeChat() {
  chats.classList.remove("open");
  chatView.classList.remove("active");
  document.querySelectorAll(".chat__item").forEach((chat) => {
    chat.classList.remove("active");
  });
}
// Fix 7: Ensure chat click handler properly sets up subscription
function attachChatClickListeners() {
  document.querySelectorAll(".chat__item").forEach((chatItem) => {
    const img = chatItem.querySelector("img");
    chatItem.addEventListener("click", async (e) => {
      // Close chat list and open chat view
      chatImgEl.src = img.src;
      if (
        e.target.closest(".chat__item") &&
        !e.target.closest(".chat__item").classList.contains("active")
      ) {
        document.querySelectorAll(".chat__item").forEach((item) => {
          item.classList.remove("active");
        });
        e.target.closest(".chat__item").classList.add("active");
        openChat();
      }

      const chatId = chatItem.getAttribute("data-chat-id");
      console.log(
        `Clicked on chat ID: ${chatId}, current chat ID: ${currentChatId}`
      );

      // Don't reload if we're already on this chat
      if (currentChatId === chatId) {
        return;
      }

      // Fix 8: Make sure we properly clean up previous subscription
      if (subscription) {
        console.log("Unsubscribing from previous chat subscription");
        try {
          subscription.unsubscribe();
        } catch (e) {
          console.warn("Error during unsubscribe:", e);
        }
        subscription = null;
      }

      currentChatId = chatId;
      const chatNameText = chatItem.getAttribute("data-chat-name");
      console.log(`Setting current chat to ${chatNameText} (ID: ${chatId})`);

      // Reset processed message IDs when changing chats
      processedMessageIds = new Set();

      // Show loading indicator
      const messagesContainer = document.querySelector(
        ".chat__messages-container"
      );
      messagesContainer.innerHTML =
        '<div class="loading-messages loader"></div>';

      // Load chat details and messages in parallel
      try {
        const [chatDetails, chatMessages, enrolledStudents] = await Promise.all(
          [
            getChatDetails(chatId),
            retrieveChatMessages(chatId),
            getEnrolledStudents(chatId), // Get students enrolled in this chat's course
          ]
        );

        // Render chat details
        renderChatDetails(chatDetails);

        // Extract all user IDs from messages and enrolled students
        const messageUserIds = chatMessages.map(
          (msg) => +msg.sender_data.slice(0, 14)
        );
        const messageUserNames = chatMessages.map(
          (msg) => msg.sender_data.slice(15)
        );
        console.log(messageUserNames);
        const allUserIds = [
          ...new Set([
            ...messageUserIds,
            ...enrolledStudents,
            instructorId,
            ...messageUserNames,
          ]),
        ];

        // Prefetch all user names in parallel before rendering messages
        // await loadUserNames(allUserIds);
        allUserIds.forEach((id) => {
          userNameCache.set(id, messageUserNames[id]);
        });
        // Only render if this is still the current chat
        if (currentChatId === chatId) {
          // Render chat messages
          renderChatMessages(chatMessages, true); // false = no animation on initial load
        }
      } catch (error) {
        console.error("Error loading messages:", error);
        messagesContainer.innerHTML =
          '<div class="error-messages">Error loading messages. Please try again.</div>';
      }

      // Set up event listener for send button
      setupSendMessageHandler(chatId);

      // Fix 9: Make sure subscription is active for this chat
      console.log(`Setting up subscription for newly selected chat ${chatId}`);
      setupChatSubscription(chatId);
    });
  });

  // Add event listener to collapse button
  collapseButton.addEventListener("click", closeChat);
}

// Get students enrolled in a specific course related to the chat
async function getEnrolledStudents(chatId) {
  try {
    // First get the course_id related to this chat
    const { data: chatData, error: chatError } = await supaClient
      .from("chat")
      .select("chat_name")
      .eq("chat_id", chatId)
      .single();
    console.log(chatData);
    if (chatError) throw chatError;
    console.log(chatData);

    // Find the course with this name
    const { data: courseData, error: courseError } = await supaClient
      .from("course")
      .select("course_id")
      .eq("course_name", chatData.chat_name)
      .single();
    console.log(courseData);

    if (courseError) throw courseError;

    // Get students enrolled in this course
    const { data: enrollmentData, error: enrollmentError } = await supaClient
      .from("enrollment")
      .select("student_id")
      .eq("course_id", courseData.course_id);

    if (enrollmentError) throw enrollmentError;
    console.log(enrollmentData);
    return enrollmentData.map((enrollment) => enrollment.student_id);
  } catch (error) {
    console.error("Error getting enrolled students:", error);
    return [];
  }
}

// Setup send message handler
function setupSendMessageHandler(chatId) {
  const sendButton = document.querySelector(".send__message-btn");
  const messageInput = document.querySelector(".message__input");

  // First, remove any existing event listeners by cloning the elements
  const newSendButton = sendButton.cloneNode(true);
  sendButton.parentNode.replaceChild(newSendButton, sendButton);

  const newMessageInput = messageInput.cloneNode(true);
  messageInput.parentNode.replaceChild(newMessageInput, messageInput);

  // Add event listener to the send button
  newSendButton.addEventListener("click", async () => {
    const messageContent = newMessageInput.value.trim();
    if (messageContent) {
      await sendMessage(chatId, messageContent);
      newMessageInput.value = ""; // Clear input after sending
      newMessageInput.focus(); // Keep focus on input for better UX
    }
  });

  // Add event listener for Enter key
  newMessageInput.addEventListener("keypress", async (e) => {
    if (e.key === "Enter") {
      e.preventDefault(); // Prevent default to avoid form submission
      const messageContent = newMessageInput.value.trim();
      if (messageContent) {
        await sendMessage(chatId, messageContent);
        newMessageInput.value = ""; // Clear input after sending
      }
    }
  });

  // Focus the input field for immediate typing
  newMessageInput.focus();
}
// Fix 10: Add more debugging to the initial setup
function setupAllChatSubscriptions() {
  console.log(`Setting up ${userChats.length} chat subscriptions...`);

  // Clean up existing subscriptions properly
  Object.entries(chatSubscriptions).forEach(([chatId, sub]) => {
    if (sub && typeof sub.unsubscribe === "function") {
      try {
        console.log(`Cleaning up subscription for chat ${chatId}`);
        sub.unsubscribe();
      } catch (e) {
        console.warn(`Error unsubscribing from chat ${chatId}:`, e);
      }
    }
  });

  // Reset subscription objects
  chatSubscriptions = {};

  // Set up a subscription for each chat
  userChats.forEach((chatId) => {
    setupChatSubscription(chatId);
  });

  // Reset reconnection attempts on successful setup
  reconnectAttempts = 0;
  isConnected = true;
}
// Fix 1: Improved setupChatSubscription function with proper channel management
function setupChatSubscription(chatId) {
  // Skip if no valid chat ID
  if (!chatId) {
    console.error("Invalid chat ID for subscription");
    return;
  }

  console.log(`Setting up subscription for chat ${chatId}`);

  // Unsubscribe from any existing subscription for this chat
  try {
    if (chatSubscriptions[chatId]) {
      chatSubscriptions[chatId].unsubscribe();
      delete chatSubscriptions[chatId]; // Ensure reference is cleared
    }
  } catch (e) {
    console.warn(`Error unsubscribing from chat ${chatId}:`, e);
  }

  try {
    // Fix 2: Use a simpler channel name without timestamp to avoid duplicate channels
    const channelName = `chat:${chatId}`;
    const channel = supaClient.channel(channelName);

    // Fix 3: Add better debugging for subscription status
    console.log(`Creating channel ${channelName} for chat ${chatId}`);

    // Subscribe to changes
    channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "message",
          filter: `chat_id=eq.${chatId}`,
        },
        handleNewMessage
      )
      .subscribe((status, err) => {
        console.log(`Subscription status for chat ${chatId}:`, status);

        if (err) {
          console.error(`Subscription error for chat ${chatId}:`, err);
        }

        if (status === "SUBSCRIBED") {
          console.log(`Successfully subscribed to chat ${chatId}`);
          isConnected = true;
          reconnectAttempts = 0;
        } else if (
          status === "CHANNEL_ERROR" ||
          status === "CLOSED" ||
          status === "TIMED_OUT"
        ) {
          console.error(
            `Error with subscription for chat ${chatId}: ${status}`
          );
          isConnected = false;

          // Try to resubscribe after a delay if there was an error
          if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttempts++;
            const delay = RECONNECT_INTERVAL * reconnectAttempts; // Increasing backoff
            console.log(
              `Attempt ${reconnectAttempts} to reconnect chat ${chatId} in ${delay}ms`
            );

            setTimeout(() => {
              if (currentChatId === chatId) {
                setupChatSubscription(chatId);
              }
            }, delay);
          } else {
            console.error(
              `Maximum reconnection attempts reached for chat ${chatId}`
            );

            // Final attempt with much longer delay
            setTimeout(() => {
              reconnectAttempts = 0;
              setupChatSubscription(chatId);
            }, RECONNECT_INTERVAL * 5);
          }
        }
      });

    // Store the subscription reference
    chatSubscriptions[chatId] = channel;

    // Fix 4: Make sure to update the current subscription reference
    if (chatId === currentChatId) {
      subscription = channel;
    }
  } catch (error) {
    console.error(`Error setting up subscription for chat ${chatId}:`, error);
  }
}
function handleNewMessage(payload) {
  if (!payload || !payload.new || !payload.new.msg_id) {
    console.error("Invalid message payload received:", payload);
    return;
  }

  const message = payload.new;
  const msgId = message.msg_id;

  // Debug message to track subscription events
  console.log(`Received message event for chat ${message.chat_id}, message ID: ${msgId}`);

  // Skip if we've already processed this message
  if (processedMessageIds.has(msgId)) {
    console.log(`Skipping duplicate message ${msgId}`);
    return;
  }

  console.log(`New message received in chat ${message.chat_id}:`, message);

  // Mark as processed to prevent duplicates
  processedMessageIds.add(msgId);
  
  // FIX: Properly parse the sender_data which is in format "id+name"
  const parts = message.sender_data.split('+');
  const senderId = parts[0];  // Get just the ID part
  const senderName = parts.length > 1 ? parts.slice(1).join('+') : "Unknown"; // Get the name part
  
  // Cache the name immediately if available
  if (senderName && senderName !== "undefined") {
    userNameCache.set(senderId, senderName);
  }

  // Always fetch the name for non-instructor senders to ensure we have student names
  if (Number(senderId) !== Number(instructorId) && 
      (!userNameCache.has(senderId) || userNameCache.get(senderId) === "Unknown User")) {
    safeGetUserName(senderId)
      .then((name) => {
        userNameCache.set(senderId, name);

        // Refresh display of sender name in any messages from this sender
        document.querySelectorAll(`[data-sender-id="${senderId}"]`).forEach((msg) => {
          const senderEl = msg.querySelector(".message__sender-name");
          if (senderEl) {
            senderEl.textContent = name;
          }
        });
      })
      .catch((err) => {
        console.error("Error fetching sender name:", err);
        userNameCache.set(senderId, "Unknown User");
      });
  }

  // Process the message update regardless
  processMessageUpdate(message);
}
function processMessageUpdate(message) {
  try {
    console.log(`Processing message update for chat ${message.chat_id}, current chat: ${currentChatId}`);
    
    // FIX: Properly parse the sender_data which is in format "id+name"
    const parts = message.sender_data.split('+');
    const senderId = parts[0];  // Get just the ID part
    const senderName = parts.length > 1 ? parts.slice(1).join('+') : "Unknown"; // Get the name part
    
    // Cache the name immediately if available
    if (senderName && senderName !== "undefined") {
      userNameCache.set(senderId, senderName);
    }

    // If this is the current open chat, add message to chat view
    if (Number(currentChatId) === Number(message.chat_id)) {
      console.log("This is the active chat, adding message to view");
      addMessageToChat(message);
    } else {
      console.log("Message is for a different chat than the current one");
    }

    // Update the chat list item with this message regardless
    updateLastMessageInChatList(message.chat_id, message.msg_content, senderId, senderName);
  } catch (error) {
    console.error("Error processing message update:", error);
  }
}
async function preloadInstructorName() {
  if (!instructorId) return;
  
  try {
    const name = await getInstructorName(instructorId);
    if (name) {
      console.log(`Preloaded instructor name: ${name}`);
      userNameCache.set(instructorId, name);
    } else {
      console.warn("Could not preload instructor name");
      userNameCache.set(instructorId, "Unknown Instructor");
    }
  } catch (error) {
    console.error("Error preloading instructor name:", error);
    userNameCache.set(instructorId, "Unknown Instructor");
  }
}
function createMessageElement(message, animate = true) {
  // Create the new message element
  const messageEl = document.createElement("div");
  messageEl.setAttribute("data-message-id", message.msg_id);
  messageEl.setAttribute("data-timestamp", new Date(message.msg_date_time).getTime());
  
  // FIX: Properly parse the sender_data which is in format "id+name"
  const parts = message.sender_data.split('+');
  const senderId = parts[0];  // Get just the ID part
  const senderName = parts.length > 1 ? parts.slice(1).join('+') : "Unknown"; // Get the name part
  
  // Cache the name immediately if available and not "undefined"
  if (senderName && senderName !== "undefined") {
    userNameCache.set(senderId, senderName);
  }
  
  messageEl.setAttribute("data-sender-id", senderId);

  const messageSenderName = document.createElement("p");
  const messageContent = document.createElement("p");
  const messageTime = document.createElement("p");

  messageSenderName.classList.add("message__sender-name");
  messageContent.classList.add("message__content");
  messageTime.classList.add("message__time");

  messageContent.textContent = message.msg_content || "";
  messageTime.textContent = formatDateTime(new Date(message.msg_date_time));

  // Check if the message is from the current instructor
  const isSentByCurrentUser = Number(senderId) === Number(instructorId);

  // Add message classes based on sender
  if (isSentByCurrentUser) {
    messageEl.classList.add("sent");
    messageSenderName.textContent = "You";
  } else {
    messageEl.classList.add("received");
    // Get sender name from cache or set a placeholder
    if (userNameCache.has(senderId) && userNameCache.get(senderId) !== "undefined") {
      messageSenderName.textContent = userNameCache.get(senderId);
    } else {
      messageSenderName.textContent = senderName !== "undefined" ? senderName : "Loading...";
      // Fetch name asynchronously
      safeGetUserName(senderId).then(name => {
        messageSenderName.textContent = name;
      });
    }
  }

  messageEl.classList.add("message");

  messageEl.appendChild(messageSenderName);
  messageEl.appendChild(messageContent);
  messageEl.appendChild(messageTime);

  // Add animation if needed
  if (animate) {
    messageEl.style.opacity = "0";
    messageEl.style.transform = "translateY(10px)";

    // Use requestAnimationFrame for smoother animations
    requestAnimationFrame(() => {
      messageEl.style.transition = "opacity 0.3s ease, transform 0.3s ease";
      messageEl.style.opacity = "1";
      messageEl.style.transform = "translateY(0)";
    });
  }

  return messageEl;
}
// Better handling of adding messages to the chat view
async function addMessageToChat(message) {
  // First check if we already have this message in the DOM
  const existingMessage = document.querySelector(
    `[data-message-id="${message.msg_id}"]`
  );
  if (existingMessage) {
    return; // Skip if already exists
  }

  try {
    // Create the message element
    const messagesContainer = document.querySelector(
      ".chat__messages-container"
    );

    // Check if we have a container
    if (!messagesContainer) {
      console.error("Messages container not found");
      return;
    }

    // Remove empty message placeholder if exists
    const emptyPlaceholder = messagesContainer.querySelector(".empty-messages");
    if (emptyPlaceholder) {
      emptyPlaceholder.remove();
    }

    // Create and append the message element
    const messageEl = createMessageElement(message, true);
    messagesContainer.appendChild(messageEl);

    // Scroll to the bottom to show the new message
    scrollToBottom();
  } catch (error) {
    console.error("Error adding message to chat:", error);
  }
}
// Efficient scrolling method with requestAnimationFrame
function scrollToBottom() {
  requestAnimationFrame(() => {
    const messagesContainer = document.querySelector(
      ".chat__messages-container"
    );
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  });
}
function formatDateTime(date) {
  const now = new Date();

  // Strip time parts for accurate day comparison
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const messageDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  const timeString = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const oneDay = 24 * 60 * 60 * 1000;
  const diffDays = Math.round((today - messageDate) / oneDay);

  if (diffDays === 0) {
    return timeString; // Today
  } else if (diffDays === 1) {
    return `Yesterday ${timeString}`;
  } else {
    const dateString = date.toLocaleDateString("en-CA"); // yyyy-mm-dd format
    return `${dateString} ${timeString}`;
  }
}
// Render the chat list with instructor's courses
async function renderChatList() {
  try {
    chatListContainer.innerHTML = '<div class="loader loading-chats"></div>';
    const chats = await getInstructorChatList();

    // Store the chat IDs for subscription
    userChats = chats.map((chat) => chat.chat_id);

    if (chats.length === 0) {
      // Display a message when no chats are available
      chatListContainer.innerHTML = `
        <li class="no-chats">
          <p>No course chats available</p>
          <p>You are not in any chats yet!</p>
        </li>
      `;
      return;
    }

    // Create a document fragment for batch DOM updates
    const fragment = document.createDocumentFragment();
    const pendingChats = [];

    // First render the basic chat list structure
    for (const chat of chats) {
      const chatItem = document.createElement("li");
      chatItem.className = "chat__item";
      chatItem.setAttribute("data-chat-id", chat.chat_id);
      chatItem.setAttribute("data-chat-name", chat.chat_name);
      chatItem.innerHTML = `
        <div class="chat__img">
          <img src="src/images/Courses/${chat.chat_name.toUpperCase()}.png" alt="${
        chat.chat_name
      }" onerror="this.onerror=null; this.src='src/images/Courses/ai.png';">
        </div>
        <div class="chat__details">
          <div class="chat__name">${chat.chat_name}</div>
          <div class="chat__last-message">Loading...</div>
        </div>
      `;

      fragment.appendChild(chatItem);
      pendingChats.push(chat.chat_id);
    }

    // Update the DOM once with all chat items
    chatListContainer.innerHTML = "";
    chatListContainer.appendChild(fragment);

    // Attach click listeners immediately
    attachChatClickListeners();

    // Set up subscriptions for all chats
    setupAllChatSubscriptions();
    // Then load last messages for each chat in parallel
    const lastMessagePromises = pendingChats.map(async (chatId) => {
      const lastMessage = await getLastMessage(chatId);
      if (lastMessage) {
        const senderId = +lastMessage.sender_data.slice(0, 14);
        const senderName = lastMessage.sender_data.slice(15);
        console.log(senderName);
        // Ensure we have the sender name
        if (senderId && !userNameCache.has(senderId)) {
          userNameCache.set(senderId, senderName);
        }
        return { chatId, lastMessage };
      }
      return { chatId, lastMessage: null };
    });

    // Update last messages as they come in
    const results = await Promise.all(lastMessagePromises);

    // Update the UI with last message data
    for (const { chatId, lastMessage } of results) {
      const chatItem = document.querySelector(
        `.chat__item[data-chat-id="${chatId}"]`
      );
      if (!chatItem) continue;

      const lastMessageEl = chatItem.querySelector(".chat__last-message");
      if (!lastMessageEl) continue;
      await updateChatLastMessageDisplay(lastMessageEl, lastMessage);
    }
  } catch (error) {
    console.error("Error rendering chat list:", error);
    chatListContainer.innerHTML = `
      <li class="error-message">
        <p>Error loading chats. Please try again.</p>
      </li>
    `;
  }
}

async function updateChatLastMessageDisplay(lastMessageEl, lastMessage) {
  let messageText = "No messages yet...";
  let senderPrefix = "";

  if (!lastMessage) {
    lastMessageEl.textContent = messageText;
    return;
  }
  const senderId = +lastMessage.sender_data.slice(0, 14);
  const senderName = lastMessage.sender_data.slice(15);
  console.log(senderName);
  // Try to get student name first for non-instructor messages
  if (senderId && Number(senderId) !== Number(instructorId)) {
    if (userNameCache.has(senderId)) {
      senderPrefix = `${userNameCache.get(senderId)}: `;
    } else {
      // Try instructor name as fallback
      const instructorName = await getInstructorName(senderId);
      if (instructorName) {
        userNameCache.set(senderId, instructorName);
        senderPrefix = `${instructorName}: `;
      } else {
        senderPrefix = "Unknown User: ";
        userNameCache.set(senderId, "Unknown User");
      }
    }
  } else if (Number(senderId) === Number(instructorId)) {
    senderPrefix = "You: ";
  }

  messageText = truncateText(lastMessage.msg_content, 30);
  lastMessageEl.textContent = senderPrefix + messageText;
}
// Truncate text to specified length
function truncateText(text, maxLength) {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

// Get the last message for a chat
async function getLastMessage(chatId) {
  const { data, error } = await supaClient
    .from("message")
    .select("*")
    .eq("chat_id", chatId)
    .order("msg_date_time", { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) {
    return null;
  }
  return data[0];
}

// Get the list of chats for the instructor //UPDATED
async function getInstructorChatList() {
  try {
    // First get the courses this instructor is teaching
    // const { data: instructorCourses, error: coursesError } = await supaClient
    //   .from("enrollment")
    //   .select("course_id")
    //   .eq("instructor_id", instructorId);
    // if (coursesError) throw coursesError;
    // if (!instructorCourses || instructorCourses.length === 0) return [];

    // // Get the course names for these courses
    // const { data: courses, error: courseNamesError } = await supaClient
    //   .from("course")
    //   .select("course_id, course_name")
    //   .in(
    //     "course_id",
    //     instructorCourses.map((course) => course.course_id)
    //   );
    // console.log(courses);
    // if (courseNamesError) throw courseNamesError;
    const {data:instructorChats,error:instructorChatsError}=await supaClient
    .from("instructor_chat")
    .select("*")
    .eq("instructor_id",instructorId);
    console.log(instructorChats);
    const chatsId = instructorChats.map((chat) => chat.chat_id);
    console.log(chatsId);
    if(instructorChatsError) throw instructorChatsError;
    // Get the chat IDs for these course names
    const { data: chats, error: chatsError } = await supaClient
      .from("chat")
      .select("*")
      .in(
        "chat_id",
        chatsId
      );

    if (chatsError) throw chatsError;

    return chats || [];
    // Get the chat IDs for these course names
    // const { data: chats, error: chatsError } = await supaClient
    //   .from("chat")
    //   .select("*")
    //   .in(
    //     "chat_name",
    //     courses.map((course) => course.course_name)
    //   );

    // if (chatsError) throw chatsError;

    // return chats || [];
  } catch (error) {
    console.error("Error fetching instructor chat list:", error);
    return [];
  }
}

// Get details for a specific chat
async function getChatDetails(chatId) {
  const { data, error } = await supaClient
    .from("chat")
    .select("*")
    .eq("chat_id", chatId)
    .single();

  if (error) {
    console.error("Error fetching chat details:", error);
    return null;
  } else {
    return data;
  }
}

// Render chat details in UI
function renderChatDetails(chat) {
  if (chat) {
    chatName.textContent = chat.chat_name;
  }
}

// Retrieve messages for a specific chat
async function retrieveChatMessages(chatId) {
  const { data, error } = await supaClient
    .from("message")
    .select("*")
    .eq("chat_id", chatId)
    .order("msg_date_time", { ascending: true }) // Primary sort by timestamp
    .order("msg_id", { ascending: true }); // Secondary sort by message_id for consistency

  if (error) {
    console.error("Error fetching chat messages:", error);
    return [];
  } else {
    // Build our processed message IDs set
    data.forEach((msg) => {
      if (msg.msg_id) {
        processedMessageIds.add(msg.msg_id);
      }
    });

    return data;
  }
}
function renderChatMessages(messages, animate = true) {
  // Get the messages container
  const messagesContainer = document.querySelector(".chat__messages-container");

  // Clear existing messages
  messagesContainer.innerHTML = "";

  if (!messages || messages.length === 0) {
    // Show a message when there are no messages
    const emptyMessage = document.createElement("div");
    emptyMessage.classList.add("empty-messages");
    emptyMessage.textContent = "No messages yet. Start the conversation!";
    messagesContainer.appendChild(emptyMessage);
    return;
  }

  // Modified: Ensure messages are properly sorted by timestamp (oldest to newest)
  messages.sort((a, b) => {
    const timeA = new Date(a.msg_date_time).getTime();
    const timeB = new Date(b.msg_date_time).getTime();

    // If timestamps are equal, sort by message_id as secondary criteria
    if (timeA === timeB) {
      return a.msg_id - b.msg_id;
    }

    return timeA - timeB;
  });

  // Performance optimization: Create a document fragment and batch render
  const fragment = document.createDocumentFragment();

  // Store all messages in a data attribute for scroll loading
  messagesContainer.setAttribute('data-total-messages', messages.length);
  
  // For large message sets, use virtual rendering
  const shouldVirtualize = messages.length > 50;

  // If virtualizing, only render the last 50 messages initially
  const messagesToRender = shouldVirtualize ? messages.slice(-50) : messages;
  
  // If we're using virtual rendering, add a load-more indicator at the top
  if (shouldVirtualize) {
    const loadMoreIndicator = document.createElement("div");
    loadMoreIndicator.id = "load-more-indicator";
    loadMoreIndicator.classList.add("load-more-indicator");
    loadMoreIndicator.innerHTML = `<span>Scroll to load ${messages.length - messagesToRender.length} older messages</span>`;
    fragment.appendChild(loadMoreIndicator);
    
    // Store the remaining messages for later loading
    messagesContainer.setAttribute('data-remaining-messages', messages.length - messagesToRender.length);
    
    // Store all messages as a JSON string in a data attribute (careful with large datasets)
    messagesContainer.setAttribute('data-all-messages', JSON.stringify(messages));
  }

  // Render messages in batches using requestAnimationFrame for better performance
  const renderBatch = (startIdx, endIdx) => {
    for (let i = startIdx; i < endIdx && i < messagesToRender.length; i++) {
      const message = messagesToRender[i];
      if (!message) continue;

      const messageEl = createMessageElement(message, false); // Don't animate batches
      fragment.appendChild(messageEl);
    }

    // Add this batch to the container
    messagesContainer.appendChild(fragment.cloneNode(true));
  };

  // For small message sets, render all at once
  if (!shouldVirtualize) {
    renderBatch(0, messagesToRender.length);
  } else {
    // For large message sets, render in chunks
    const BATCH_SIZE = 20;
    const totalBatches = Math.ceil(messagesToRender.length / BATCH_SIZE);

    let batchIndex = 0;

    const processBatch = () => {
      if (batchIndex >= totalBatches) {
        // All batches processed - scroll to bottom when done
        scrollToBottom();
        return;
      }

      const startIdx = batchIndex * BATCH_SIZE;
      const endIdx = Math.min(startIdx + BATCH_SIZE, messagesToRender.length);

      renderBatch(startIdx, endIdx);
      batchIndex++;

      // Process next batch on next animation frame
      requestAnimationFrame(processBatch);
    };

    // Start batch processing
    processBatch();
  }

  // Set up scroll event listener for loading older messages
  if (shouldVirtualize) {
    setupScrollListener(messagesContainer, messages);
  }

  // Scroll to bottom when all messages are rendered
  scrollToBottom();
}
async function updateLastMessageInChatList(chatId, messageContent, senderId, senderName = null) {
  const chatItem = document.querySelector(`.chat__item[data-chat-id="${chatId}"]`);

  if (!chatItem) return;

  const lastMessageEl = chatItem.querySelector(".chat__last-message");
  if (!lastMessageEl) return;

  try {
    // Determine sender prefix based on sender ID
    let senderPrefix = "";

    // Handle current user case first (most efficient)
    if (Number(senderId) === Number(instructorId)) {
      senderPrefix = "You: ";
    }
    // Use provided senderName if available
    else if (senderName && senderName !== "undefined") {
      senderPrefix = `${senderName}: `;
      userNameCache.set(senderId, senderName);
    }
    // Check cache for other users
    else if (userNameCache.has(senderId) && userNameCache.get(senderId) !== "undefined") {
      senderPrefix = `${userNameCache.get(senderId)}: `;
    }
    // Fetch name if not in cache - prioritize student names
    else {
      const studentName = await getStudentName(senderId);
      if (studentName) {
        userNameCache.set(senderId, studentName);
        senderPrefix = `${studentName}: `;
      } else {
        const instructorName = await getInstructorName(senderId);
        userNameCache.set(senderId, instructorName || "Unknown User");
        senderPrefix = `${instructorName || "Unknown User"}: `;
      }
    }

    // Update the message preview
    const truncatedMessage = truncateText(messageContent, 30);
    lastMessageEl.textContent = senderPrefix + truncatedMessage;

    // Move this chat to the top of the list for better UX
    const parent = chatItem.parentNode;
    if (parent && parent.firstChild !== chatItem) {
      parent.insertBefore(chatItem, parent.firstChild);
    }
  } catch (error) {
    console.error("Error updating last message in chat list:", error);
    // Fallback display if there's an error
    const truncatedMessage = truncateText(messageContent, 30);
    lastMessageEl.textContent = truncatedMessage;
  }
}
async function sendMessage(chatId, messageContent) {
  try {
    const timestamp = new Date();
    
    // Get instructor name from cache or fetch it
    let instructorName = userNameCache.get(instructorId);
    if (!instructorName || instructorName === "undefined") {
      try {
        instructorName = await getInstructorName(instructorId);
        if (instructorName) {
          userNameCache.set(instructorId, instructorName);
        } else {
          instructorName = "Unknown Instructor";
          userNameCache.set(instructorId, instructorName);
        }
      } catch (err) {
        console.error("Error fetching instructor name:", err);
        instructorName = "Unknown Instructor";
        userNameCache.set(instructorId, instructorName);
      }
    }

    // Create a temporary visual placeholder for the message with a unique ID
    const tempMessageId = `temp-${Date.now()}`;
    const messagesContainer = document.querySelector(".chat__messages-container");

    // Remove any "empty messages" placeholder if it exists
    const emptyPlaceholder = messagesContainer.querySelector(".empty-messages");
    if (emptyPlaceholder) {
      emptyPlaceholder.remove();
    }

    // Create temporary message element
    const messageEl = document.createElement("div");
    messageEl.id = tempMessageId;
    messageEl.classList.add("message", "sent", "pending");
    // Add timestamp as data attribute for sorting
    messageEl.setAttribute("data-timestamp", timestamp.getTime());
    messageEl.setAttribute("data-sender-id", instructorId);

    const messageSenderName = document.createElement("p");
    messageSenderName.classList.add("message__sender-name");
    messageSenderName.textContent = "You"; // Always "You" for current user

    const messageContent_el = document.createElement("p");
    messageContent_el.classList.add("message__content");
    messageContent_el.textContent = messageContent;

    const messageTime = document.createElement("p");
    messageTime.classList.add("message__time");
    messageTime.textContent = formatDateTime(timestamp);

    messageEl.appendChild(messageSenderName);
    messageEl.appendChild(messageContent_el);
    messageEl.appendChild(messageTime);

    // Append message to the end for chronological order
    messagesContainer.appendChild(messageEl);

    // Add animation for a smoother appearance
    messageEl.style.opacity = "0";
    messageEl.style.transform = "translateY(10px)";

    // Use requestAnimationFrame for smoother animations
    requestAnimationFrame(() => {
      messageEl.style.transition = "opacity 0.2s ease, transform 0.2s ease";
      messageEl.style.opacity = "1";
      messageEl.style.transform = "translateY(0)";

      // Scroll to bottom to show the new message
      scrollToBottom();
    });

    // FIX: Format sender_data properly as "id+name"
    const sender_data = `${instructorId}+${instructorName}`;
    console.log("Sending message with sender_data:", sender_data);

    // Send the actual message to the database
    const { data, error } = await supaClient
      .from("message")
      .insert({
        chat_id: chatId,
        msg_content: messageContent,
        sender_data: sender_data,
        msg_date_time: timestamp.toISOString(),
      })
      .select();

    if (error) {
      console.error("Error sending message:", error);
      messageEl.classList.add("error");
      messageTime.textContent = "Failed to send";

      // Add retry button
      const retryButton = document.createElement("button");
      retryButton.classList.add("retry-button");
      retryButton.textContent = "Retry";
      retryButton.addEventListener("click", () => {
        // Remove the failed message
        messageEl.remove();
        // Try sending again
        sendMessage(chatId, messageContent);
      });
      messageEl.appendChild(retryButton);
    } else {
      console.log("Message sent:", data);

      // Instead of removing the placeholder, just mark it as confirmed and add the ID
      messageEl.classList.remove("pending");
      messageEl.classList.add("confirmed");

      if (data && data[0] && data[0].msg_id) {
        messageEl.setAttribute("data-message-id", data[0].msg_id);

        // Add this message ID to our processed set to prevent duplication
        processedMessageIds.add(data[0].msg_id);
      }

      // Update the chat list manually in case the subscription is slow
      await updateLastMessageInChatList(chatId, messageContent, instructorId, instructorName);
    }
  } catch (err) {
    console.error("Exception sending message:", err);
  }
}
// Fix 11: Initialize chat with explicit debugging
export function initInstructorChat() {
  console.log("Initializing instructor chat...");

  // Initial setup when page loads
  renderChatList();

  // Set up auto-reconnect for chat subscriptions
  window.addEventListener("online", () => {
    console.log("Network connection restored, reconnecting chat subscriptions");
    setupAllChatSubscriptions();
  });

  // Cleanup subscriptions when page is unloaded
  window.addEventListener("beforeunload", () => {
    console.log("Page unloading, cleaning up subscriptions");
    Object.values(chatSubscriptions).forEach((sub) => {
      if (sub) sub.unsubscribe();
    });
  });

  // Handle window resize for mobile view
  window.addEventListener("resize", () => {
    if (window.innerWidth > 768) {
      // If returning to desktop size, make sure chat view is visible if a chat is selected
      if (document.querySelector(".chat__item.active")) {
        openChat();
      }
    }
  });

  // Add help text for empty state
  if (chatListContainer.children.length === 0) {
    const helpText = document.createElement("div");
    helpText.className = "help-text";
    helpText.innerHTML = `
      <p>Welcome to the chat system!</p>
      <p>Your course chats will appear here once you're assigned to teach courses.</p>
    `;
    chatListContainer.appendChild(helpText);
  }

  console.log("Instructor chat initialization complete");
}

// async function getStudentName(studentId) {
//   const { data, error } = await supaClient
//     .from("student")
//     .select("student_name")
//     .eq("student_id", studentId);
//   if (error) {
//     console.error("Error fetching student name:", error);
//     return null;
//   }
//   if (data && data.length > 0) {
//     return data[0].student_name;
//   }
// }
async function getStudentName(studentId) {
  try {
    const { data, error } = await supaClient
      .from("student")
      .select("student_name")
      .eq("student_id", studentId)
      .single();

    if (error) throw error;
    return data?.student_name || null;
  } catch (error) {
    console.error(`Error fetching student name for ID ${studentId}:`, error);
    return null;
  }
}
// Add this at the very end of your file (after the getStudentName function)

// Initialize the chat system when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM fully loaded, initializing chat system...");
  initInstructorChat();
});

// Alternatively, if the script is loaded at the end of the body, you can call it directly:
// Call initInstructorChat function right away if script is at bottom of page
if (
  document.readyState === "complete" ||
  document.readyState === "interactive"
) {
  console.log("Document already ready, initializing chat immediately");
  setTimeout(initInstructorChat, 1); // Small timeout to ensure execution after current JS completes
} else {
  document.addEventListener("DOMContentLoaded", function () {
    console.log("DOM fully loaded, initializing chat system...");
    initInstructorChat();
  });
}
document.addEventListener("DOMContentLoaded", function() {
  preloadInstructorName();
});

function setupScrollListener(messagesContainer, allMessages) {
  // Remove any existing scroll listener first
  messagesContainer.removeEventListener('scroll', messagesContainer.scrollHandler);
  
  // Initialize scroll variables
  let isLoading = false;
  let loadedMessageCount = parseInt(messagesContainer.querySelector('.message:last-child')?.getAttribute('data-message-index') || 50);
  let remainingToLoad = allMessages.length - loadedMessageCount;
  
  // Create the scroll handler function
  messagesContainer.scrollHandler = function() {
    // If we're near the top and not currently loading
    if (messagesContainer.scrollTop < 100 && !isLoading && remainingToLoad > 0) {
      isLoading = true;
      
      // Show loading indicator
      let loadMoreIndicator = messagesContainer.querySelector('#load-more-indicator');
      if (loadMoreIndicator) {
        loadMoreIndicator.innerHTML = '<div class="loader small-loader"></div><span>Loading older messages...</span>';
      }
      
      // Set a small timeout to prevent rapid firing of load events
      setTimeout(() => {
        // Load the next batch of messages (up to 20 more)
        const batchSize = Math.min(20, remainingToLoad);
        const startIndex = Math.max(0, allMessages.length - loadedMessageCount - batchSize);
        const endIndex = allMessages.length - loadedMessageCount;
        
        // Get the height before adding new content
        const scrollHeightBefore = messagesContainer.scrollHeight;
        const scrollPosition = messagesContainer.scrollTop;
        
        // Create a fragment for the new messages
        const fragment = document.createDocumentFragment();
        
        // Add the older messages at the top (after the load more indicator)
        for (let i = startIndex; i < endIndex; i++) {
          const messageEl = createMessageElement(allMessages[i], false);
          messageEl.setAttribute('data-message-index', i);
          fragment.appendChild(messageEl);
        }
        
        // If we have a load more indicator, insert after it; otherwise prepend to container
        if (loadMoreIndicator) {
          loadMoreIndicator.after(fragment);
        } else {
          messagesContainer.prepend(fragment);
        }
        
        // Update counts
        loadedMessageCount += batchSize;
        remainingToLoad -= batchSize;
        
        // Update the load more indicator
        if (loadMoreIndicator) {
          if (remainingToLoad > 0) {
            loadMoreIndicator.innerHTML = `<span>Scroll to load ${remainingToLoad} older messages</span>`;
          } else {
            // All messages loaded, remove the indicator
            loadMoreIndicator.remove();
          }
        }
        
        // Adjust scroll position to maintain view position
        const scrollHeightAfter = messagesContainer.scrollHeight;
        const scrollDiff = scrollHeightAfter - scrollHeightBefore;
        messagesContainer.scrollTop = scrollPosition + scrollDiff;
        
        // Reset loading flag
        isLoading = false;
      }, 300);
    }
  };
  
  // Add the scroll event listener
  messagesContainer.addEventListener('scroll', messagesContainer.scrollHandler);
}

// Add small loader CSS style
const style = document.createElement('style');
style.textContent = `
  .load-more-indicator {
    text-align: center;
    padding: 10px;
    color: #999aaa;
    font-size: 14px;
    border-bottom: 1px solid #eee;
  }
  
  .small-loader {
    width: 20px;
    height: 20px;
    border-width: 2px;
    display: inline-block;
    vertical-align: middle;
    margin-right: 8px;
  }
`;
document.head.appendChild(style);