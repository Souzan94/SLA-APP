var client = ZAFClient.init();
client.invoke('resize', {
    width: '100%',
    height: '120px'
});
var recipientsList;
const clientID = 'zdg-omniwise-apps';
const selectedRecipientsContainer = document.getElementById('selectedTags');
var group1Items = document.getElementById('group1Options').getElementsByTagName('li');
var group2Items = document.getElementById('group2Options').getElementsByTagName('li');
var group3Items = document.getElementById('group3Options').getElementsByTagName('li');
var selectedItems = [];
var subdomain, appId, currentUser, plan;
var cancel = document.getElementById("cancelBtn");
var cancelBtn = document.getElementById("cancel_Btn");
var scheduleNameFeild = document.getElementById('schedule-name');
const rulesTable = document.getElementById("rules");
const schedulesTable = document.getElementById("schedulesList");
var createRule = document.getElementById("addRule");
var createSchedule = document.getElementById("addSchedule");
var rulesForm = document.getElementById("rulesList");
var schedulesForm = document.getElementById("schedulesForm");
const responseTimeField = document.getElementById('response-time');
const warningTimeField = document.getElementById('warning-time');
var businessHoursForm = document.getElementById("business-hours");
var ruleTemplate = document.getElementById("rulePanel");
const ruleNameField = document.getElementById('info1');
const ruleDescField = document.getElementById('info2');
var tagField = document.getElementById('tagInput');
const ruleTypes = document.getElementById('ruleTypes');
const scheduleOptions = document.getElementById('scheduleName');
const scheduleSelect = document.getElementById('scheduleLs');
var editingRow = null;

var timeZone;
var placeHoldersList;
const charCount = document.getElementById('charCount');
const maxChars = 300;
const breachEmailSubject = document.getElementById('txt-2');
const breachEmailBody = document.getElementById('subject');
const tagsContainer = document.getElementById('tagsContainer');
const saveButton = document.getElementById('submitbtn');
var schedules;
var defaultScheduleId;
var rulesList;


document.addEventListener("DOMContentLoaded", async function() {
    timeZone = await getAccountTimeZone();

    // Keep this section as-is per user request
    client.context().then(function(context) {
        subdomain = context.account.subdomain;

        client.get('currentUser').then(function(data) {
            currentUser = data.currentUser.id;
        });

        client.metadata().then(function(metadata) {
            appId = metadata.appId;
            plan = metadata.plan.name;
			plan - 'Advanced';
        });

        isClientAuthorized().then(result => {
            if (result.authorized) {
                document.getElementById('activationDiv').style.display = 'none';

                getSchedules(subdomain).then(schedules => {
                    if (plan === 'Advanced') {
                        addSchedulestoTable(schedules);
                        schedulesForm.style.display = 'block';
                    } else {
                        const defaultSchedule = schedules.find(schedule => schedule.isDefault === true);
                        if (defaultSchedule && defaultSchedule.businessHours) {
                            defaultScheduleId = defaultSchedule.scheduleId;
                            initializeBusinessHours(defaultSchedule.businessHours, defaultSchedule.scheduleName);
                        }
                        businessHoursForm.style.display = 'block';
                        cancelBtn.style.display = 'none';
                    }
                });




                document.querySelector(".navbar").style.display = "block";
                document.getElementById('scheduleContainer').style.display = 'block';

                getSLARules(subdomain).then(async (rules) => {
                    rulesList = rules;

                    if (plan !== 'Advanced') {
                        rulesList = await handleBasicPlanSLARules(rulesList, defaultScheduleId, subdomain);
                    }
                });




            } else {
                document.getElementById('activationDiv').style.display = 'block';
                document.querySelector(".navbar").style.display = "none";
            }
        });
    });

    // Load and populate groups and users
    try {
        const [groups, users] = await Promise.all([getGroups(), getUsers()]);
        populateOptions(groups, 'group1Options', true, 'Group');
        populateOptions(users, 'group2Options', false, 'User');
    } catch (error) {
        console.error('Failed to load groups or users:', error);
    }
});

document.getElementById('available-placeholders').onclick = function() {
    const dropdown = document.getElementById('placeholderDropdown');
    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';

    // Populate the dropdown list when opened
    if (dropdown.style.display === 'block') {
        populatePlaceholdersDropdown();
    }
};




async function handleBasicPlanSLARules(rules, defaultScheduleId, subdomain) {
    for (const rule of rules) {
        if (parseInt(rule.scheduleId) !== defaultScheduleId) {
            await deleteSLARule(subdomain, rule.ruleId);
            await deleteTrigger(rule.ruleId);
            await deleteTrigger(rule.onBreachTrigger);
        }
    }

    // Return only rules that match the default schedule
    return rules.filter(rule => parseInt(rule.scheduleId) === defaultScheduleId);
}




function populatePlaceholdersDropdown() {
    const dropdownList = document.querySelector('#placeholderDropdown ul');
    dropdownList.innerHTML = ''; // Clear any existing list items

    // Loop through placeholders and create li elements
    placeHoldersList.forEach(placeholder => {
        const li = document.createElement('li');
        li.id = placeholder.id; // Set the id of the li
        li.textContent = placeholder.value; // Set the text content

        // Create a wrapper span to hold the text and the button
        const textSpan = document.createElement('span');
        textSpan.textContent = placeholder.value;
        textSpan.classList.add('placeholder-text'); // Class for styling

        // Create a copy button
        const copyButton = document.createElement('button');
        copyButton.textContent = 'Copy';
        copyButton.classList.add('copy-button'); // Class for hiding the button
        copyButton.onclick = function(event) {
            event.preventDefault();

            copyToClipboard(placeholder.value); // Copy the placeholder value to clipboard
        };

        //      li.appendChild(textSpan);  // Append the text span to the li
        li.appendChild(copyButton); // Append the button to the li
        dropdownList.appendChild(li); // Append the li to the ul
    });
}

function copyToClipboard(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    selectPlaceholder(text);

}

function selectPlaceholder(placeholder) {
    // Implement your logic to handle the selected placeholder here

    // You might want to close the dropdown after selecting
    document.getElementById('placeholderDropdown').style.display = 'none';
}


function getPlaceHolders() {
    return client.request({
        url: 'https://4zmxioxz13.execute-api.us-east-1.amazonaws.com/NotifyAPP/getPlaceHolders',
        type: 'GET',
        contentType: 'application/json'
    }).then(response => {
        const responseBody = JSON.parse(response.body);
        if (response.statusCode === 200) {
            return responseBody.placeHolders || [];
        } else {
            return [];
        }
    }).catch(error => {
        console.error('Error fetching placeholders:', error);
        return [];
    });
}



breachEmailBody.addEventListener('input', function() {
    const length = breachEmailBody.value.trim().length;

    // Calculate the remaining characters
    const remainingChars = maxChars - length;

    // Update the character count display
    charCount.textContent = remainingChars;

    // If the length exceeds the maximum, truncate the text
    if (length > maxChars) {
        breachEmailBody.value = breachEmailBody.value.substring(0, maxChars);
        charCount.textContent = 0;
    }
});




function updateGroupSelection(groupItems, type) {
    Array.from(groupItems).forEach(li => {
        const liDataValue = li.getAttribute('data-value');


        // Match both id and type
        if (recipientsList.some(recipient => recipient.id === liDataValue && recipient.type === type)) {
            li.classList.add('selected');
        }
    });
}

const inputs = [
    ruleNameField,
    ruleDescField,
    breachEmailSubject,
    breachEmailBody,
    warningTimeField,
    responseTimeField
];
inputs.forEach(el => el.addEventListener('input', validateFields));



ruleTypes.addEventListener('change', function(event) {


    validateFields(event);
});



scheduleSelect.addEventListener('change', function(event) {


    validateFields(event);
});

document.getElementById('slaRules').addEventListener('click', function(event) {


    event.preventDefault();
    resetTable();
    appendRulesToTable(rulesList);
    document.getElementById('scheduleContainer').style.display = 'none';
    ruleTemplate.style.display = 'none';
    rulesForm.style.display = 'block';
    document.getElementById('sla_Rules').style.display = 'block';


    getPlaceHolders().then(placeholders => {

        placeHoldersList = placeholders;
    });
    scheduleSelect.length = 1;

    getSchedules(subdomain).then(schedules => {
        schedules.forEach(schedule => {
            const option = document.createElement('option');
            option.value = schedule.scheduleId;
            option.textContent = schedule.scheduleName;
            scheduleSelect.appendChild(option);
        });
        const defaultSchedule = schedules.find(schedule => schedule.isDefault === true);

        if (defaultSchedule) {
            defaultScheduleId = defaultSchedule.scheduleId;
        }
    });

});

document.getElementById('schedule').addEventListener('click', function(event) {

    event.preventDefault();
    document.getElementById('sla_Rules').style.display = 'none'; // Hide content area
    document.getElementById('scheduleContainer').style.display = 'block'; // Show message area


});



createRule.addEventListener("click", function() {
    editingRow = null;
    rulesForm.style.display = 'none';
    if (plan != 'Advanced') {


        document.getElementById('scheduleLs').value = defaultScheduleId === null ? "0" : defaultScheduleId;
        document.getElementById('scheduleLs').disabled = true;



    }
    ruleTemplate.style.display = 'block';
    document.getElementById('submitbtn').disabled = true;


});


createSchedule.addEventListener("click", function() {
    editingRow = null;
    schedulesForm.style.display = 'none';
    businessHoursForm.style.display = 'block';


});
cancel.addEventListener("click", function() {
    resetForm();
    ruleTemplate.style.display = 'none';
    rulesForm.style.display = 'block';

});

cancelBtn.addEventListener("click", function() {
    businessHoursForm.style.display = 'none';
    schedulesForm.style.display = 'block';
    scheduleNameFeild.value = '';
    resetWeek();
});



function populateOptions(items, targetElementId, isGroup = true, itemType) {
    const targetOptionsList = document.getElementById(targetElementId);

    items.forEach(item => {
        const li = document.createElement('li');
        li.textContent = isGroup ? item.name : item.name + ' (' + item.email + ')';
        li.setAttribute('data-value', item.id);

        // Add click event for selecting options
        li.addEventListener('click', () => {
            selectOption(li, li.textContent, itemType);
            closeDropdown('dropdownContent');
        });

        targetOptionsList.appendChild(li);
    });
}

function toggleDropdown(contentId) {
    const dropdownContent = document.getElementById(contentId);
    const caretIcon = dropdownContent.previousElementSibling.querySelector('.caret');

    // Toggle the dropdown open/closed state
    const isDropdownOpen = dropdownContent.style.display === 'block';
    dropdownContent.style.display = isDropdownOpen ? 'none' : 'block';

    // Rotate the caret icon based on dropdown state
    if (caretIcon) {
        caretIcon.style.transform = isDropdownOpen ? 'rotate(45deg)' : 'rotate(135deg)';
    }
}

function toggleGroup(groupNumber) {
    const groupOptions = document.getElementById(`group${groupNumber}Options`);
    const caretIcon = document.querySelector(`.dropdown-group:nth-child(${groupNumber * 2 - 1}) .caret`);

    const isGroupOpen = groupOptions.style.display === 'block';
    groupOptions.style.display = isGroupOpen ? 'none' : 'block';
    caretIcon.classList.toggle('down');
}



function selectOption(li, optionText, tagType) {
    const selectedTags = document.getElementById('selectedTags');


    if (selectedItems.includes(li.getAttribute('data-value'))) {
        return;
    }

    // Check if this option is already selected
    if (li.classList.contains('selected')) {
        // If already selected, deselect it
        li.classList.remove('selected');
        selectedItems.splice(selectedItems.indexOf(li.getAttribute('data-value')), 1);

        // If "All Users" is removed, enable all options in all groups


        // Remove the associated tag
        const tags = selectedTags.getElementsByClassName('tag');
        for (let tag of tags) {
            if (tag.textContent.includes(optionText)) {
                tag.remove();
                break;
            }
        }
        validateFields();
        closeDropdown('dropdownContent');
        return; // Exit the function
    }



    // Otherwise, proceed to select the option
    li.classList.add('selected');
    selectedItems.push(li.getAttribute('data-value'));

    // Create a tag for the selected option
    const tag = document.createElement('div');
    tag.classList.add('tag');
    tag.textContent = optionText;
    tag.id = tagType;
    // Add a remove button to the tag
    const removeTag = document.createElement('span');
    removeTag.textContent = 'x';
    removeTag.classList.add('remove-tag');
    removeTag.onclick = function() {
        tag.remove();
        li.classList.remove('selected');
        selectedItems.splice(selectedItems.indexOf(li.getAttribute('data-value')), 1);

        validateFields();
    };

    tag.appendChild(removeTag);
    selectedTags.appendChild(tag);

    validateFields();
    closeDropdown('dropdownContent');
}


function validateFields() {
    const fields = [
        ruleNameField,
        ruleDescField,
        responseTimeField,
        warningTimeField,
        ruleTypes,
        breachEmailSubject,
        breachEmailBody,
    ];

    const areTextFieldsFilled = fields.every(field => field.value.trim() !== '');
    const hasRuleTypeSelected = ruleTypes.value !== '';
    const hasSelectedRecipients = selectedRecipientsContainer.querySelectorAll('.tag').length > 0;
    const hasBreachTags = tagsContainer.querySelectorAll('.tag').length > 0;
    const hasScheduleSelected = scheduleSelect.value !== '';



    const isValid = areTextFieldsFilled && hasRuleTypeSelected && hasScheduleSelected && hasSelectedRecipients && hasBreachTags;

    saveButton.disabled = !isValid;
}

function closeDropdown(id) {
    const dropdownContent = document.getElementById(id);
    const caretIcon = document.querySelector('.dropdown-title .caret');

    dropdownContent.style.display = 'none';
    caretIcon.style.transform = 'rotate(45deg)';
    isDropdownOpen = false;
}


function getGroups(url = '/api/v2/groups', Groups = []) {
    return client.request({
        url: url,
        type: "GET",
        contentType: "application/json"
    }).then(response => {
        Groups.push(...response.groups);
        if (response.next_page) {
            return getGroups(response.next_page, Groups);
        } else {
            return Groups;
        }
    }).catch(error => {
        throw error;
    });
}

function getUsers(url = '/api/v2/search.json?query=type:user -role:end-user', allUsers = []) {
    return client.request({
        url: url,
        type: "GET",
        contentType: "application/json"
    }).then(response => {
        allUsers.push(...response.results);
        if (response.next_page) {
            return getUsers(response.next_page, allUsers);
        } else {
            return allUsers;
        }
    }).catch(error => {
        throw error;
    });
}
const hint = document.getElementById('hintMessage');
let typingTimer;
tagField.addEventListener('input', function() {
    clearTimeout(typingTimer);
    if (tagInput.value.trim() !== '') {
        hint.style.display = 'block'; // Show hint when typing
    } else {
        hint.style.display = 'none'; // Hide hint if empty
    }
    validateFields();

});

tagField.addEventListener('keydown', function(event) {
    const tagInput = this;

    // Check if Enter or Space key is pressed and input is not empty
    if ((event.key === 'Enter' || event.key === ' ') && tagInput.value.trim() !== '') {
        hint.style.display = 'none'; // Hide hint when they press Enter or Space
        // Prevent the space key from creating an empty tag
        if (event.key === ' ') {
            event.preventDefault();
        }

        // Create the tag element
        const tagText = tagInput.value.trim();
        const tag = document.createElement('div');
        tag.classList.add('tag');
        tag.textContent = tagText;

        // Create the 'x' remove button
        const removeTag = document.createElement('span');
        removeTag.textContent = 'x';
        removeTag.classList.add('remove-tag');

        // Function to remove the tag
        removeTag.onclick = function() {
            tag.remove();
        };

        // Append the 'x' button to the tag
        tag.appendChild(removeTag);

        // Append the tag inside the tagsContainer (before the input field)
        tagsContainer.appendChild(tag);

        // Clear the input field after adding the tag
        tagInput.value = '';
    }
    validateFields();
});




function resetTable() {
    var table = document.querySelector('#rules table');
    if (table) {
        table.remove(); // This will completely remove the table
    }
}

var webhookId
var warningTriggerID, breachedTriggerId;

const endpoint = 'https://gk719hb5uf.execute-api.us-east-1.amazonaws.com/SLA/handleSLA';

document.getElementById("ruleForm").addEventListener("submit", async function(event) {
    event.preventDefault();
    var responseTime = responseTimeField.value;
    var warningTime = warningTimeField.value;


    if (parseInt(responseTime, 10) == 0 || parseInt(warningTime, 10) == 0) {
        client.invoke('notify', 'Time should be greater than 0', 'error', {
            duration: 10000
        });
        return;
    }
    if (parseInt(responseTime, 10) <= parseInt(warningTime, 10)) {
        client.invoke('notify', 'Resolution time shoud be after warning time', 'error', {
            duration: 10000
        });
        return;

    }
    document.getElementById('submitbtn').textContent = 'saving...'
    document.getElementById('submitbtn').disabled = true;
    try {
        var ruleName = ruleNameField.value;
        var ruleDesc = ruleDescField.value;
        var ruleType = document.getElementById('ruleTypes').value;
        var scheduleId = scheduleSelect.value;
        let selectedRecipients = [];
        var emailSubject = breachEmailSubject.value;
        var emailBody = breachEmailBody.value;

        const tagElements = document.querySelectorAll('#tagsContainer .tag');
        const tags = [];
        let originalPayload = {};

        tagElements.forEach(tagEl => {
            const tagText = tagEl.childNodes[0].textContent.trim(); // The text before the <span> element
            tags.push(tagText);
        });

        // Collect selected items from Group 1 (Groups)
        Array.from(group1Items).forEach(option => {
            if (option.classList.contains('selected')) {

                selectedRecipients.push({
                    type: 'Group',
                    name: option.textContent,
                    id: option.getAttribute('data-value')
                });


            }
        });

        // Collect selected items from Group 2 (Users)
        const selectedOptions = Array.from(group2Items).filter(option =>
            option.classList.contains('selected')
        );




        // If you need to push the selected recipients after counting
        selectedOptions.forEach(option => {
            selectedRecipients.push({
                type: 'User',
                name: option.textContent,
                id: option.getAttribute('data-value')
            });
        });


        const selectedItems = Array.from(group3Items).filter(option =>
            option.classList.contains('selected')
        );




        selectedItems.forEach(option => {
            selectedRecipients.push({
                type: 'placeHolder',
                name: option.textContent,
                id: option.getAttribute('data-value')
            });
        });



        selectedRecipients = selectedRecipients;

        // Create arrays of selected user IDs and group IDs
        const usersIds = selectedRecipients
            .filter(recipient => recipient.type === 'User')
            .map(recipient => recipient.id);

        const usersNames = selectedRecipients
            .filter(recipient => recipient.type === 'User')
            .map(recipient => recipient.name);

        const groupsIds = selectedRecipients
            .filter(recipient => recipient.type === 'Group')
            .map(recipient => recipient.id);
        const groupsNames = selectedRecipients
            .filter(recipient => recipient.type === 'Group')
            .map(recipient => recipient.name);
        const placeholders = selectedRecipients
            .filter(recipient => recipient.type === 'placeHolder')
            .map(recipient => recipient.id);



        const webhooks = await getWebhook(subdomain);
        const triggers = await getTriggers(subdomain);
        const hasSLAWarningTrigger = triggers.some(trigger => trigger.triggerName === "SLA-Warning");

        if (!webhooks || webhooks.length === 0) {
            webhookId = await createWebhook(endpoint, "SLA-HUB");
            addWebhook(webhookId, "SLA-HUB");
        } else {

            webhookId = webhooks[0].webhookId;

        }

        if (!hasSLAWarningTrigger) {
            warningTriggerID = await createSLAWarningTrigger();

            addTrigger(warningTriggerID, "SLA-Warning");
        }




        if (editingRow) {

            let sla_RuleId = editingRow.getAttribute('data-rule-id');
            let sla_breached_rule_id = editingRow.getAttribute('data-breachedTrigger-id');
            originalPayload = await getTriggerById(sla_RuleId);

            await updateSLARule(sla_RuleId, ruleName, ruleDesc, ruleType, scheduleId, responseTime, warningTime, webhookId, originalPayload, groupsIds, placeholders, usersIds); //UPDATE SLA  TRIGGER in zendesk
            await saveSLABreachTrigger(selectedRecipients, emailSubject, emailBody, tags, ruleName, sla_breached_rule_id);
            await addSLARule(subdomain, sla_RuleId, ruleName, ruleDesc, ruleType, scheduleId, responseTime, warningTime, currentUser, sla_breached_rule_id, selectedRecipients, emailSubject, emailBody, tags); //update SLA RULE  IN database
            updateSLARuleInTable(ruleName, ruleDesc, ruleType, scheduleId, responseTime, warningTime, sla_RuleId, currentUser, editingRow, selectedRecipients, emailSubject, emailBody, tags, sla_breached_rule_id);

        } else {

            ruleId = await createSLARule(webhookId, ruleName, ruleDesc, ruleType, scheduleId, responseTime, warningTime, tags, groupsIds, placeholders, usersIds); //CREATE SLA  TRIGGER in zendesk

            breachedTriggerId = await saveSLABreachTrigger(selectedRecipients, emailSubject, emailBody, tags, ruleName);

            await addSLARule(subdomain, ruleId, ruleName, ruleDesc, ruleType, scheduleId, responseTime, warningTime, currentUser, breachedTriggerId, selectedRecipients, emailSubject, emailBody, tags); //SAVE SLA  RULE TO THE database
            var rules = [];

            const newRule = {
                subdomain: subdomain,
                ruleId: ruleId,
                ruleName: ruleName,
                ruleDesc: ruleDesc,
                ruleType: ruleType,
                scheduleId: scheduleId,
                responseTime: responseTime,
                warningTime: warningTime,
                createdBy: currentUser,
                onBreachTrigger: breachedTriggerId,
                recipients: selectedRecipients,
                emailSubject: emailSubject,
                emailBody: emailBody,
                tags: tags
            };

            rules.push(newRule);
            appendRulesToTable(rules);


        }


        resetForm();
        ruleTemplate.style.display = 'none';
        rulesForm.style.display = 'block';
    } catch (error) {
        console.error("An error occurred during SLA rule submission:", error);
    } finally {
        document.getElementById('submitbtn').textContent = 'submit';
        document.getElementById('submitbtn').disabled = false;
    }

});

function checkFields() {
    const holidayName = document.getElementById('holiday-name').value;
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const addButton = document.getElementById('add-holiday-btn');

    if (holidayName && startDate && endDate) {
        addButton.disabled = false;
        addButton.classList.remove('disabled-btn');
    } else {
        addButton.disabled = true;
        addButton.classList.add('disabled-btn');
    }
}

// Add event listeners to input fields to trigger the check
document.getElementById('holiday-name').addEventListener('input', checkFields);
document.getElementById('start-date').addEventListener('input', checkFields);
document.getElementById('end-date').addEventListener('input', checkFields);




function switchTab(tabName) {
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    // Remove active classes from all tabs and contents
    tabs.forEach(tab => tab.classList.remove('active-tab'));
    tabContents.forEach(content => content.classList.remove('active-tab-content'));

    if (tabName === "holidays") {
        getHolidays(subdomain).then(holidays => {
            initializeHolidayTable(holidays)
        });
    } else {

    }
    // Add active class to the clicked tab and corresponding content
    document.querySelector(`.tab[data-tab="${tabName}"]`).classList.add('active-tab');
    document.getElementById(tabName).classList.add('active-tab-content');

}

function toggleDay(day) {
    // Get the checkbox and time input elements for the day
    const checkbox = document.getElementById(`${day}-toggle`);
    const openInput = document.getElementById(`${day}-open`);
    const closeInput = document.getElementById(`${day}-close`);

    if (checkbox.checked) {
        // If closed, hide and reset the time inputs
        openInput.style.display = 'none';
        closeInput.style.display = 'none';
        openInput.value = '';
        closeInput.value = '';
    } else {
        // If open, show the time inputs
        openInput.style.display = 'inline';
        closeInput.style.display = 'inline';
    }
}

async function addHoliday() {
    const holidayName = document.getElementById('holiday-name').value;
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;

    // Validate input fields
    if (!holidayName || !startDate || !endDate) {
        return;
    }

    const startdate = new Date(startDate);
    const enddate = new Date(endDate);

    if (startdate > enddate) {
        client.invoke('notify', 'Please check the start/end date of the holiday', 'error', {
            duration: 10000
        });
        return;
    }

    try {
        // Call saveHoliday and wait for it to complete
        const holidayId = await saveHoliday(holidayName, startDate, endDate, subdomain);

        // Proceed to add the holiday to the table only if saveHoliday is successful
        const table = document.getElementById('holiday-table').getElementsByTagName('tbody')[0];
        const newRow = table.insertRow();

        // Insert cells and populate them with data
        const cell1 = newRow.insertCell(0);
        const cell2 = newRow.insertCell(1);
        const cell3 = newRow.insertCell(2);
        const cell4 = newRow.insertCell(3);
        const cell5 = newRow.insertCell(4); // Cell for Holiday ID

        cell1.textContent = holidayName;
        cell2.textContent = formatDate(startDate);
        cell3.textContent = formatDate(endDate);

        // Create a remove link
        const removeLink = document.createElement('a');
        removeLink.href = '#';
        removeLink.textContent = 'Remove';
        removeLink.classList.add('remove-link');
        removeLink.onclick = function(event) {
            event.preventDefault();
            table.deleteRow(newRow.rowIndex - 1); // Adjust index due to header row
            deleteHoliday(holidayId, subdomain); // Pass the holidayId to the delete function
        };

        cell4.appendChild(removeLink);

        // Set the Holiday ID cell, apply the hidden-column class, and set a data attribute
        cell5.textContent = holidayId;
        cell5.classList.add('hidden-column');
        cell5.setAttribute('data-holiday-id', holidayId);

        // Clear input fields
        document.getElementById('holiday-name').value = '';
        document.getElementById('start-date').value = '';
        document.getElementById('end-date').value = '';

    } catch (error) {
        console.error('Error saving holiday:', error);
    }
}




// Function to format date as MM/DD/YYYY
function formatDate(dateString) {
    const date = new Date(dateString);
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const day = ('0' + date.getDate()).slice(-2);
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
}

document.getElementById('saveHoursBtn').addEventListener('click', async function() {
    // Change the button text
    const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const businessHours = [];
    const dayNameMap = {
        'Mon': 'Monday',
        'Tue': 'Tuesday',
        'Wed': 'Wednesday',
        'Thu': 'Thursday',
        'Fri': 'Friday',
        'Sat': 'Saturday',
        'Sun': 'Sunday'
    };

    daysOfWeek.forEach(day => {
        const open = document.getElementById(`${day}-open`).value;
        const close = document.getElementById(`${day}-close`).value;
        const isClosed = document.getElementById(`${day}-toggle`).checked;

        businessHours.push({
            dayOfWeek: day,
            open: open,
            close: close,
            isClosed: isClosed
        });
    });

    const invalidDay = businessHours.find(day => !day.isClosed && (!day.open || !day.close));
    if (invalidDay) {
        const dayName = dayNameMap[invalidDay.dayOfWeek];
        const msg = `Please provide both open and close times for ${dayName}.`;
        client.invoke('notify', msg, 'error', {
            duration: 10000
        });
        document.getElementById('saveHoursBtn').textContent = "Save Business Hours";
        return;
    }

    this.textContent = 'Saving...';
    const scheduleName = scheduleNameFeild.value;

    if (plan === 'Advanced') {
        if (editingRow) {
            const scheduleId = editingRow.getAttribute('data-schedule-id');
            const createdBy = editingRow.getAttribute('data-createdBy');
            await updateSchedule(subdomain, scheduleName, businessHours, scheduleId);
            updateScheduleInTable(scheduleName, scheduleId, businessHours, createdBy, editingRow);
        } else {
            const scheduleId = await saveSchedule(subdomain, scheduleName, businessHours, false);

            var schedules = [];
            const newSchedule = {
                subdomain: subdomain,
                scheduleId: scheduleId,
                scheduleName: scheduleName,
                businessHours: businessHours,
                createdBy: currentUser
            };
            schedules.push(newSchedule);
            addSchedulestoTable(schedules);
        }

        resetWeek();
        scheduleNameFeild.value = '';
        businessHoursForm.style.display = 'none';
        schedulesForm.style.display = 'block';
    } else {
        if (defaultScheduleId) {

            await updateSchedule(subdomain, scheduleName, businessHours, defaultScheduleId);


        } else {

            const scheduleId = await saveSchedule(subdomain, scheduleName, businessHours, true);
        }

    }

});

function getBusinessHours(domainName) {
    const payload = {
        payload: {
            Key: {
                "domain": domainName,
            }
        }
    };

    return client.request({
        url: 'https://gk719hb5uf.execute-api.us-east-1.amazonaws.com/SLA/getBusinessHours',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(payload)
    }).then(response => {
        const responseBody = JSON.parse(response.body);
        if (response.statusCode === 200) {
            return responseBody.businessHours || []; // Return rules array
        } else {
            return []; // Return empty array on error
        }
    }).catch(error => {
        console.error('Error fetching rules:', error);
        return []; // Return empty array on error
    });
}

function saveBusinessHours(domainName, businessHours) {


    const payload = {
        payload: {
            Item: {
                domain: domainName,
                businessHours: businessHours
            }
        }
    };

    // Send the payload to the API
    return client.request({
        url: 'https://gk719hb5uf.execute-api.us-east-1.amazonaws.com/SLA/addSchedule',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(payload)
    }).then(response => {
        document.getElementById('saveHoursBtn').textContent = "Save Business Hours";

    }).catch(error => {
        document.getElementById('saveHoursBtn').textContent = "Save Business Hours";
        console.error('Error saving business hours:', error);
    });


}
document.getElementById('activate').addEventListener('click', function(event) {
    renderAuthorizationPage(clientID);
});

function resetWeek() {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    days.forEach(day => {
        const openInput = document.getElementById(`${day}-open`);
        const closeInput = document.getElementById(`${day}-close`);
        const toggle = document.getElementById(`${day}-toggle`);

        // Uncheck the checkbox
        toggle.checked = false;

        // Reset input values
        openInput.value = '';
        closeInput.value = '';

        // Make time inputs visible
        openInput.style.display = 'inline';
        closeInput.style.display = 'inline';
    });
}



function renderAuthorizationPage(clientId) {

    const url = `https://${subdomain}.zendesk.com/oauth/authorizations/new?response_type=code&redirect_uri=https://m0nskfyta8.execute-api.us-east-1.amazonaws.com/config/getGlobalAccessToken&client_id=${clientId}&scope=read%20write`;

    // Create the Basic Authentication token

    client.invoke('instances.create', {
        location: 'modal',
        url: url,
        size: {
            width: '700px',
            height: '700px'
        }
    }).then(function(data) {
        var instanceGuid = data['instances.create'][0].instanceGuid;
        var modalClient = client.instance(instanceGuid);
        modalClient.on('modal.close',  function() {
            isClientAuthorized().then(result => {
				
                if (result.authorized) {
       getSchedules(subdomain).then(schedules => {
                        if (plan === 'Advanced') {
                        addSchedulestoTable(schedules);
                        schedulesForm.style.display = 'block';
                    } else {
                        const defaultSchedule = schedules.find(schedule => schedule.isDefault === true);
                        if (defaultSchedule && defaultSchedule.businessHours) {
                            defaultScheduleId = defaultSchedule.scheduleId;
                            initializeBusinessHours(defaultSchedule.businessHours, defaultSchedule.scheduleName);
                        }
                        businessHoursForm.style.display = 'block';
                        cancelBtn.style.display = 'none';
                    }
	   });
					
					
                    document.getElementById('activationDiv').style.display = 'none';
                    document.querySelector(".navbar").style.display = "block";
                    document.getElementById('scheduleContainer').style.display = 'block';
                    authToken = result.accessToken;
                    getSLARules(subdomain).then(async rules => {
                        rulesList = rules;

                        if (plan !== 'Advanced') {
                            rulesList = await handleBasicPlanSLARules(rulesList, defaultScheduleId, subdomain);
                        }
                    });



                } else {
                    document.getElementById('scheduleContainer').style.display = 'none';
                    document.querySelector(".navbar").style.display = "none";

                    document.getElementById('activationDiv').style.display = 'block';
                }
            }).catch(error => {
                console.error('Authorization check failed:', error);
            });

        });

    });


}




function isClientAuthorized() {
    var id = subdomain;
    var payload = {
        payload: {
            "Key": {
                "id": id
            }
        }
    };

    return client.request({
        url: 'https://m0nskfyta8.execute-api.us-east-1.amazonaws.com/config/isGlobalAuthorized',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(payload)
    }).then(response => {
        const responseBody = JSON.parse(response.body);

        // Return both authorized status and accessToken
        return {
            authorized: responseBody.authorized,
            accessToken: responseBody.accessToken || null // Default to null if accessToken is undefined
        };
    }).catch(error => {
        console.error('Error checking if user is app admin:', error);
        throw error;
    });
}




function saveSchedule(domainName, scheduleName, businessHours, isDefault) {

    const payload = {
        payload: {
            Item: {
                domain: domainName,
                scheduleName: scheduleName,
                createdBy: currentUser,
                businessHours: businessHours,
                isDefault: isDefault
            }
        }
    };

    return client.request({
        url: 'https://gk719hb5uf.execute-api.us-east-1.amazonaws.com/SLA/addNewSchedule',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(payload)
    }).then(response => {
        document.getElementById('saveHoursBtn').textContent = "Save Business Hours";

        // Extract and return scheduleId from response
        const resBody = typeof response.body === 'string' ? JSON.parse(response.body) : response.body;
        const scheduleId = resBody.scheduleId;
        return scheduleId; // You can return this to use it elsewhere

    }).catch(error => {
        document.getElementById('saveHoursBtn').textContent = "Save Business Hours";
        console.error('Error saving business hours:', error);
    });
}


function updateSchedule(domainName, scheduleName, businessHours, scheduleId) {


    const payload = {
        payload: {
            Key: {
                domain: domainName,
                scheduleId: scheduleId

            },
            "AttributeUpdates": {

                "scheduleName": {


                    "Value": scheduleName
                },

                "businessHours": {


                    "Value": businessHours
                },

            }
        }
    };

    return client.request({
        url: 'https://gk719hb5uf.execute-api.us-east-1.amazonaws.com/SLA/updateSchedule',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(payload)
    }).then(response => {
        document.getElementById('saveHoursBtn').textContent = "Save Business Hours";

    }).catch(error => {
        document.getElementById('saveHoursBtn').textContent = "Save Business Hours";
        console.error('Error saving business hours:', error);
    });
}

async function saveHoliday(name, startDate, endDate, domain) {
    const options = {
        url: "https://gk719hb5uf.execute-api.us-east-1.amazonaws.com/SLA/add_Holiday",
        type: "POST",
        headers: {
            "Content-Type": "application/json" // Specify content type
        },
        data: JSON.stringify({
            payload: {
                Item: {
                    domainName: domain,
                    holidayName: name,
                    startDate: startDate,
                    endDate: endDate

                }
            }
        })
    };

    try {
        const response = await client.request(options);

        const parsedBody = JSON.parse(response.body);
        const holidayId = parsedBody.holidayId; // Now you can access instanceId

        // Extract and return the approvalId from the response body
        return holidayId;
    } catch (error) {
        console.error(error);
        throw error; // Re-throw the error for the caller to handle
    }
}


function deleteHoliday(holidayId, domainName) {
    const payload = {
        payload: {
            Key: {
                "holidayId": holidayId,
                "domain": domainName
            }
        }
    };

    return client.request({
        url: 'https://gk719hb5uf.execute-api.us-east-1.amazonaws.com/SLA/deleteHoliday',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(payload)
    }).then(response => {

    }).catch(error => {
        console.error('Error delete rule:', error);
        return []; // Return empty array on error
    });
}




function getHolidays(domainName) {
    const payload = {
        payload: {
            Key: {
                "domain": domainName,
            }
        }
    };

    return client.request({
        url: 'https://gk719hb5uf.execute-api.us-east-1.amazonaws.com/SLA/getHolidays',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(payload)
    }).then(response => {
        const responseBody = JSON.parse(response.body);

        if (response.statusCode === 200) {
            return responseBody.holidays || []; // Return rules array
        } else {
            return []; // Return empty array on error
        }
    }).catch(error => {
        console.error('Error fetching rules:', error);
        return []; // Return empty array on error
    });
}

function getSchedules(domainName) {
    const payload = {
        payload: {
            Key: {
                "domain": domainName,
            }
        }
    };

    return client.request({
        url: 'https://gk719hb5uf.execute-api.us-east-1.amazonaws.com/SLA/getSchedules',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(payload)
    }).then(response => {

        const responseBody = JSON.parse(response.body);
        if (response.statusCode === 200) {
            return responseBody.schedules || []; // Return rules array
        } else {
            return []; // Return empty array on error
        }
    }).catch(error => {
        console.error('Error fetching rules:', error);
        return []; // Return empty array on error
    });
}



function deleteSchedule(scheduleId) {
    const payload = {
        payload: {
            Key: {
                "scheduleId": scheduleId,
                "subdomain": subdomain
            }
        }
    };

    return client.request({
        url: 'https://gk719hb5uf.execute-api.us-east-1.amazonaws.com/SLA/deleteSchedule',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(payload)
    }).then(response => {

    }).catch(error => {
        console.error('Error delete rule:', error);
        return []; // Return empty array on error
    });
}


function initializeHolidayTable(holidays) {
    const tableBody = document.getElementById('holiday-table').getElementsByTagName('tbody')[0];
    tableBody.innerHTML = ''; // Clear existing table rows

    holidays.forEach(holiday => {
        const newRow = tableBody.insertRow();

        // Insert cells and populate them with data
        const cell1 = newRow.insertCell(0);
        const cell2 = newRow.insertCell(1);
        const cell3 = newRow.insertCell(2);
        const cell4 = newRow.insertCell(3);
        const cell5 = newRow.insertCell(4); // Cell for Holiday ID

        cell1.textContent = holiday.name;
        cell2.textContent = formatDate(holiday.startDate);
        cell3.textContent = formatDate(holiday.endDate);

        // Create a remove link
        const removeLink = document.createElement('a');
        removeLink.href = '#';
        removeLink.textContent = 'Remove';
        removeLink.classList.add('remove-link');
        removeLink.onclick = function(event) {
            event.preventDefault();
            tableBody.deleteRow(newRow.rowIndex - 1);
            deleteHoliday(holiday.holidayId, subdomain); // Pass the holidayId to the delete function
        };

        cell4.appendChild(removeLink);

        // Set the Holiday ID cell, apply the hidden-column class, and set a data attribute
        cell5.textContent = holiday.holidayId;
        cell5.classList.add('hidden-column');
        cell5.setAttribute('data-holiday-id', holiday.holidayId);
    });
}


function initializeBusinessHours(businessHours, scheduleName) {
    scheduleNameFeild.value = scheduleName;
    businessHours.forEach((day) => {
        const dayId = day.dayOfWeek;
        const openTime = day.open;
        const closeTime = day.close;
        const isClosed = day.isClosed;

        const openInput = document.getElementById(`${dayId}-open`);
        const closeInput = document.getElementById(`${dayId}-close`);
        const toggleInput = document.getElementById(`${dayId}-toggle`);

        if (isClosed) {
            toggleInput.checked = true;
            openInput.style.display = 'none';
            closeInput.style.display = 'none';
        } else {
            toggleInput.checked = false;
            openInput.style.display = 'inline';
            closeInput.style.display = 'inline';

            if (openTime) openInput.value = openTime;
            if (closeTime) closeInput.value = closeTime;
        }
    });


}

function createWebhook(endpoint, name) {

    var commonPayload = {
        webhook: {
            endpoint: endpoint,
            http_method: "POST",
            name: name,
            request_format: "json",
            status: "active",
            subscriptions: ["conditional_ticket_events"]
        }
    };



    return client.request({
        url: `/api/v2/webhooks`,
        type: "POST",
        contentType: "application/json",
        httpCompleteResponse: true,
        autoRetry: true,
        data: JSON.stringify(commonPayload)
    }).then(response => {
        if (response.status === 201) {
            var webhookId = response.responseJSON.webhook.id;
            return webhookId;
        } else {
            throw new Error("Failed to create webhook");
        }
    }).catch(error => {
        console.error("Error creating webhook:", error);
        return null;
    });
}


function createSLAWarningTrigger() {

    var payload = {
        "trigger": {
            "actions": [{
                    "field": "notification_user",
                    "value": [
                        "assignee_id",
                        "SLA-Warning",
                        "Hi {{ticket.assignee.first_name}}\n\nPlease note that the SLA breach Soon for the ticket —{{ticket.id}}— please resolve or close.\n\nRegards.\n\n\n"
                    ]

                }

            ],
            "conditions": {
                "all": [{
                        "field": "current_tags",
                        "operator": "includes",
                        "value": "sla_warning"
                    },
                    {
                        "field": "update_type",
                        "operator": "is",
                        "value": "Change"
                    }
                ],
                "any": []
            },
            "title": "SLA-Warning",
            "description": "Sending email to ticket assignee before SLA is Breached."
        }
    };

    return client.request({
        url: `/api/v2/triggers`,
        type: "POST",
        contentType: "application/json",
        httpCompleteResponse: true,
        autoRetry: true,
        data: JSON.stringify(payload) // Convert the whole payload to a JSON string
    }).then(response => {
        if (response.status === 201) {
            var triggerID = response.responseJSON.trigger.id;
            return triggerID; // Return trigger ID if successful
        } else {
            throw new Error('Failed to create trigger');
        }
    });


}

function saveSLABreachTrigger(recipients, subject, body, tags, ruleName, triggerId) {
    var payload = {
        "trigger": {
            "actions": [],
            "conditions": {
                "all": [{
                        "field": "current_tags",
                        "operator": "includes",
                        "value": tags.join(' ')
                    },
                    {
                        "field": "update_type",
                        "operator": "is",
                        "value": "Change"
                    }
                ],
                "any": []
            },
            "title": "SLA-Breached" + "-" + ruleName,
            "description": "Sending email to the selected recipients when SLA is Breached."
        }
    };

    recipients.forEach(recipient => {
        if (recipient.type === "User") {
            payload.trigger.actions.push({
                "field": "notification_user",
                "value": [
                    recipient.id,
                    subject,
                    body
                ]
            });
        } else if (recipient.type === "placeHolder") {
            let placeholderValue;
            if (recipient.id === "assignee") {
                placeholderValue = "assignee_id";
            } else if (recipient.id === "current_user") {
                placeholderValue = "current_user";
            } else if (recipient.id === "requester") {
                placeholderValue = "requester_id";
            }

            payload.trigger.actions.push({
                "field": "notification_user",
                "value": [
                    placeholderValue,
                    subject,
                    body
                ]
            });
        } else if (recipient.type === "Group") {
            payload.trigger.actions.push({
                "field": "notification_group",
                "value": [
                    recipient.id,
                    subject,
                    body
                ]
            });
        }
    });

    const method = triggerId ? "PUT" : "POST";
    const url = triggerId ? `/api/v2/triggers/${triggerId}` : `/api/v2/triggers`;

    return client.request({
        url: url,
        type: method,
        contentType: "application/json",
        httpCompleteResponse: true,
        autoRetry: true,
        data: JSON.stringify(payload)
    }).then(response => {
        if (response.status === 200 || response.status === 201) {
            if (method === "POST") {
                return response.responseJSON.trigger.id;
            }
            // Do not return anything for PUT
        } else {
            throw new Error(`Failed to ${method === "PUT" ? "update" : "create"} trigger`);
        }
    });
}




function addTrigger(triggerID, triggerName, recipients) {

    // Start by setting up the base payload
    const payload = {
        Item: {
            subdomain: subdomain,
            triggerName: triggerName,
            triggerId: triggerID
        }
    };

    // If recipients is not null, add it to the payload
    if (recipients !== null) {
        payload.Item.recipients = recipients;
    }

    const options = {
        url: "https://gk719hb5uf.execute-api.us-east-1.amazonaws.com/SLA/add_SLA_Trigger",
        type: "POST",
        headers: {
            "Content-Type": "application/json" // Specify content type
        },
        data: JSON.stringify({
            payload
        })
    };

    client.request(options).then(response => {
        // Handle response if needed
    }).catch(error => {
        console.error(error);
    });
}


function getWebhook(domainName) {

    var payload = {
        payload: {
            Key: {
                "subdomain": domainName,
            }
        }
    };

    return client.request({
        url: 'https://gk719hb5uf.execute-api.us-east-1.amazonaws.com/SLA/get_SLA_Webhooks',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(payload)

    }).then(response => {
        const responseBody = JSON.parse(response.body);
        if (response.statusCode === 200) {
            return responseBody.webhooks || [];
        } else {
            return [];
        }
    }).catch(error => {});

}


function getTriggers(domainName) {

    var payload = {
        payload: {
            Key: {
                "subdomain": domainName,
            }
        }
    };

    return client.request({
        url: 'https://gk719hb5uf.execute-api.us-east-1.amazonaws.com/SLA/get_SLA_Triggers',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(payload)

    }).then(response => {
        const responseBody = JSON.parse(response.body);
        if (response.statusCode === 200) {
            return responseBody.triggers || [];
        } else {
            return [];
        }
    }).catch(error => {});

}

function createSLARule(SLA_hub, ruleName, ruleDesc, ruleType, scheduleId, responseTime, warningTime, tags, groupsIds, placeHolders, usersIds) {

    var placeHoldersArray = [];

    // Check if placeHolders contains 'assignee', 'current_user', or 'all_users'
    if (placeHolders.length > 0) {
        placeHolders.forEach(function(placeholder) {
            if (placeholder === 'assignee') {
                // Add the placeholder for the assignee ID
                placeHoldersArray.push("{{ticket.assignee.id}}");
            } else if (placeholder === 'current_user') {
                // Add the placeholder for the current user ID
                placeHoldersArray.push("{{current_user.id}}");
            } else if (placeholder === 'all_users') {
                // Add 'all_users' as is, without any placeholder formatting
                placeHoldersArray.push("all_users");
            }
        });
    }

    var payload = {
        "trigger": {
            "actions": [{
                "field": "notification_webhook",
                "value": [
                    SLA_hub,
                    JSON.stringify({
                        payload: {
                            Item: {
                                ticket: "{{ticket.id}}",
                                ruleType: ruleType,
                                scheduleId: scheduleId,
                                responseTime: responseTime,
                                warningTime: warningTime,
                                domain: subdomain,
                                createdDate: "{{ticket.created_at_with_timestamp}}",
                                timeZone: timeZone,
                                appId: appId,
                                onBreachTags: tags,
                                users: usersIds,
                                groups: groupsIds,
                                placeHolders: placeHoldersArray


                            }
                        }
                    })
                ]
            }],
            "conditions": {
                "all": [{
                    "field": "update_type",
                    "operator": "is",
                    "value": "Create"
                }],
                "any": []
            },
            "title": "SLA:" + ruleName,
            "description": ruleDesc
        }
    };

    return client.request({
        url: `/api/v2/triggers`,
        type: "POST",
        contentType: "application/json",
        httpCompleteResponse: true,
        autoRetry: true,
        data: JSON.stringify(payload) // Convert the whole payload to a JSON string
    }).then(response => {
        if (response.status === 201) {
            var triggerID = response.responseJSON.trigger.id;
            return triggerID; // Return trigger ID if successful
        } else {
            throw new Error('Failed to create trigger');
        }
    });
}

function updateSLARule(ruleId, ruleName, ruleDesc, ruleType, scheduleId, responseTime, warningTime, SLA_hub, payload, groupsIds, placeHolders, usersIds) {
    var placeHoldersArray = [];

    // Check if placeHolders contains 'assignee', 'current_user', or 'all_users'
    if (placeHolders.length > 0) {
        placeHolders.forEach(function(placeholder) {
            if (placeholder === 'assignee') {
                // Add the placeholder for the assignee ID
                placeHoldersArray.push("{{ticket.assignee.id}}");
            } else if (placeholder === 'current_user') {
                // Add the placeholder for the current user ID
                placeHoldersArray.push("{{current_user.id}}");
            } else if (placeholder === 'all_users') {
                // Add 'all_users' as is, without any placeholder formatting
                placeHoldersArray.push("all_users");
            }
        });
    }




    const payloadCopy = JSON.parse(JSON.stringify(payload)); // Deep clone
    // Update title and description
    payloadCopy.title = "SLA:" + ruleName;
    payloadCopy.description = ruleDesc;

    // Update the ruleType inside the webhook JSON string
    const webhookAction = payloadCopy.actions.find(action => action.field === "notification_webhook");

    if (webhookAction && webhookAction.value && webhookAction.value.length === 2) {
        const webhookPayloadStr = webhookAction.value[1];

        try {
            const webhookPayload = JSON.parse(webhookPayloadStr);
            webhookPayload.payload.Item.ruleType = ruleType;
            webhookPayload.payload.Item.scheduleId = scheduleId;
            webhookPayload.payload.Item.responseTime = responseTime;
            webhookPayload.payload.Item.warningTime = warningTime;
            webhookPayload.payload.Item.users = usersIds;
            webhookPayload.payload.Item.groups = groupsIds;
            webhookPayload.payload.Item.placeHolders = placeHoldersArray;
            // Re-encode the updated webhook payload
            webhookAction.value[1] = JSON.stringify(webhookPayload);
        } catch (e) {
            console.error("Failed to parse webhook payload:", e);
        }
    }

    return client.request({
        url: `/api/v2/triggers/${ruleId}`,
        type: "put",
        contentType: "application/json",
        httpCompleteResponse: true,
        autoRetry: true,
        data: JSON.stringify({
            trigger: payloadCopy
        }) // Wrap with "trigger"
    }).then(response => {}).catch(error => {

        console.error("Error updating trigger:", error);
    });
}


function addWebhook(webhookId, webhookName) {

    const options = {
        url: "https://gk719hb5uf.execute-api.us-east-1.amazonaws.com/SLA/add_SLA_Hub_webhook",
        type: "POST",
        headers: {
            "Content-Type": "application/json" // Specify content type
        },
        data: JSON.stringify({
            payload: {
                Item: {
                    subdomain: subdomain,
                    webhookId: webhookId,
                    webhookName: webhookName

                }
            }
        })
    };

    client.request(options).then(response => {}).catch(error => {
        console.error(error);
    });
}



async function getTriggerById(triggerId) {
    const options = {
        url: `/api/v2/triggers/${triggerId}`,
        type: 'GET',
        cors: false,
    };

    try {
        const response = await client.request(options);

        return response.trigger; // Return the trigger object directly
    } catch (error) {
        console.error("Failed to fetch trigger:", error);
        return null;
    }
}




async function addSLARule(domain, ruleId, ruleName, ruleDesc, ruleType, scheduleId, responseTime, warningTime, createdBy, TriggerId, recipientsList, emailSubject, emailBody, tags) {


    const options = {
        url: "https://gk719hb5uf.execute-api.us-east-1.amazonaws.com/SLA/add_SLA_Rule",
        type: "POST",
        headers: {
            "Content-Type": "application/json" // Specify content type
        },
        data: JSON.stringify({
            payload: {
                Item: {
                    subdomain: domain,
                    ruleId: ruleId.toString(),
                    ruleName: ruleName,
                    ruleDesc: ruleDesc,
                    ruleType: ruleType,
                    scheduleId: scheduleId,
                    responseTime: responseTime,
                    warningTime: warningTime,
                    createdBy: createdBy,
                    onBreachTrigger: TriggerId,
                    recipients: recipientsList,
                    emailSubject: emailSubject,
                    emailBody: emailBody,
                    tags: tags


                }
            }
        })
    };

    client.request(options).then(response => {}).catch(error => {
        console.error(error);
    });
}
async function add_SLA_Settings(domain, totalResponseTime) {


    const options = {
        url: "https://gk719hb5uf.execute-api.us-east-1.amazonaws.com/SLA/add_SLA_settings",
        type: "POST",
        headers: {
            "Content-Type": "application/json" // Specify content type
        },
        data: JSON.stringify({
            payload: {
                Item: {
                    domain: domain,
                    totalResponseTime: totalResponseTime
                }
            }
        })
    };
    client.request(options).then(response => {}).catch(error => {
        console.error(error);
    });
}




function deleteSLARule(domainName, ruleId) {
    const payload = {
        payload: {
            Key: {
                "subdomain": domainName,
                "ruleId": ruleId
            }
        }
    };

    return client.request({
        url: 'https://gk719hb5uf.execute-api.us-east-1.amazonaws.com/SLA/delete_SLA_Rule',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(payload)
    }).then(response => {

    }).catch(error => {
        console.error('Error delete rule:', error);
        return []; // Return empty array on error
    });
}



async function appendRulesToTable(rules) {

    var table = document.querySelector('#rules table');



    if (!table) {
        table = document.createElement('table');
        const headerRow = table.insertRow();
        const headers = ['Rule Name', 'Rule Description', 'Rule Type', 'Total Response Time', 'Warning Time', 'Created By', 'SLA Breach Recipients', 'SLA Breach Email Body', 'SLA Breach Email Subject', 'Tags on SLA Breach', 'Actions'];

        // Create table headers
        headers.forEach(headerText => {
            const header = document.createElement('th');
            header.textContent = headerText;
            headerRow.appendChild(header);
        });

        rulesTable.appendChild(table); // Append table only if it's newly created
    }

    const usersMap = new Map();

    // Fetch user names for all user IDs
    const userIds = Array.from(new Set(rules.map((rule) => rule.createdBy)));
    await Promise.all(
        userIds.map(async (userId) => {
            const userName = await getUserById(userId);
            usersMap.set(userId, userName);
        })
    );

    const ruleTypeMapping = {
        calendar: "Calendar",
        businessHours: "Business Hours"
    };

    // Iterate over each rule and add to the existing table
    rules.forEach(rule => {
        // Check if rule already exists in the table
        if (document.querySelector(`[data-rule-id="${rule.ruleId}"]`)) {
            return; // Skip adding duplicate rows
        }
        var recipientsInfo;

        extractRecipientsInfo(rule.recipients).then(recipientsInfo => {
            recipientsInfo = recipientsInfo;

            const row = table.insertRow();
            row.setAttribute('data-rule-id', rule.ruleId); // Unique identifier to prevent duplicates
            row.setAttribute('data-breachedTrigger-id', rule.onBreachTrigger);
            row.setAttribute('schedule-id', rule.scheduleId);

            const rowData = [
                rule.ruleName,
                rule.ruleDesc,
                ruleTypeMapping[rule.ruleType] || rule.ruleType,
                rule.responseTime,
                rule.warningTime,
                usersMap.get(rule.createdBy) || rule.createdBy,
                recipientsInfo,
                rule.emailSubject,
                rule.emailBody,
                rule.tags.join()

            ];


            rowData.forEach((cellData) => {
                const cell = row.insertCell();
                cell.textContent = cellData;
            });

            // Create the "Action" column with three dots button
            const actionCell = row.insertCell();
            const actionButton = document.createElement('button');
            actionButton.textContent = '⋮'; // Vertical dots
            actionButton.classList.add('action-btn');

            // Create a dropdown menu for the action
            const dropdownMenu = document.createElement('div');
            dropdownMenu.classList.add('dropdown-menu');
            dropdownMenu.style.display = 'none';


            const editTriggerOption = document.createElement('div');
            editTriggerOption.textContent = 'Edit Trigger';
            editTriggerOption.classList.add('dropdown-item');

            // Add event listener for the click event to open the edit URL
            editTriggerOption.addEventListener('click', () => {
                const address = `https://${subdomain}.zendesk.com/admin/objects-rules/rules/triggers/${rule.ruleId}`;
                window.open(address, '_blank'); // Open the URL in a new tab
            });


            // Create the Edit option
            const editOption = document.createElement('div');
            editOption.textContent = 'Edit';
            editOption.classList.add('dropdown-item');
            editOption.addEventListener('click', () => {
                var cells = row.getElementsByTagName('td');
                ruleNameField.value = cells[0].innerText;
                ruleDescField.value = cells[1].innerText;
                breachEmailSubject.value = cells[5].innerText;
                breachEmailBody.value = cells[6].innerText;
                ruleTypes.value = rule.ruleType;
                document.getElementById('response-time').value = rule.responseTime;
                document.getElementById('warning-time').value = rule.warningTime;

                scheduleSelect.value = rule.scheduleId || 0;


                document.getElementById('response-time').value = rule.responseTime;
                rule.tags.forEach(tag => {
                    createTag(tag);
                });
                initializeRecipientsList(rule.recipients);
                editingRow = row;
                rulesForm.style.display = 'none';
                ruleTemplate.style.display = 'block';
            });

            // Create the Delete option
            const deleteOption = document.createElement('div');
            deleteOption.textContent = 'Delete';
            deleteOption.classList.add('dropdown-item');
            deleteOption.addEventListener('click', () => {
                table.deleteRow(row.rowIndex);
                deleteSLARule(subdomain, rule.ruleId);
                deleteTrigger(rule.ruleId);
                deleteTrigger(rule.onBreachTrigger);

            });

            // Append options to dropdown
            dropdownMenu.appendChild(editTriggerOption);
            dropdownMenu.appendChild(editOption);
            dropdownMenu.appendChild(deleteOption);

            // Append dropdown to action button
            actionCell.appendChild(actionButton);
            actionCell.appendChild(dropdownMenu);

            // Toggle dropdown visibility
            actionButton.addEventListener('click', () => {
                dropdownMenu.style.display = dropdownMenu.style.display === 'none' ? 'block' : 'none';
            });

            document.addEventListener('click', function(event) {
                if (!actionCell.contains(event.target) && dropdownMenu.style.display === 'block') {
                    dropdownMenu.style.display = 'none';
                }
            });
        });
    });

}


async function addSchedulestoTable(schedules) {

    var table = document.querySelector('#schedulesList table');

    if (!table) {
        table = document.createElement('table');
        const headerRow = table.insertRow();
        const headers = ['Schedule Name', 'CreatedBy', 'Actions'];

        // Create table headers
        headers.forEach(headerText => {
            const header = document.createElement('th');
            header.textContent = headerText;
            headerRow.appendChild(header);
        });

        schedulesTable.appendChild(table); // Append table only if it's newly created
    }
    const usersMap = new Map();

    // Fetch user names for all user IDs
    const userIds = Array.from(new Set(schedules.map((schedule) => schedule.createdBy)));
    await Promise.all(
        userIds.map(async (userId) => {
            const userName = await getUserById(userId);
            usersMap.set(userId, userName);
        })
    );

    schedules.forEach(schedule => {
        if (document.querySelector(`[data-schedule-id="${schedule.scheduleId}"]`)) {
            return; // Skip adding duplicate rows
        }

        const row = table.insertRow();
        row.setAttribute('data-schedule-id', schedule.scheduleId);
        row.setAttribute('data-business-hours', JSON.stringify(schedule.businessHours));
        row.setAttribute('data-createdBy', schedule.createdBy);

        const rowData = [
            schedule.scheduleName,
            usersMap.get(schedule.createdBy) || schedule.createdBy

        ];


        rowData.forEach((cellData) => {
            const cell = row.insertCell();
            cell.textContent = cellData;
        });

        // Create the "Action" column with three dots button
        const actionCell = row.insertCell();
        const actionButton = document.createElement('button');
        actionButton.textContent = '⋮'; // Vertical dots
        actionButton.classList.add('action-btn');

        const dropdownWrapper = document.createElement('div');
        dropdownWrapper.classList.add('dropdown-wrapper');
        // Create a dropdown menu for the action
        const dropdownMenu = document.createElement('div');
        dropdownMenu.classList.add('dropdown-options');
        dropdownMenu.style.display = 'none';



        // Create the Edit option
        const editOption = document.createElement('div');
        editOption.textContent = 'Edit';
        editOption.classList.add('dropdown-item');
        editOption.addEventListener('click', () => {
            var cells = row.getElementsByTagName('td');
            const scheduleName = cells[0].innerText;
            editingRow = row;
            const businessHoursData = row.getAttribute('data-business-hours');
            const businessHours = JSON.parse(businessHoursData);
            initializeBusinessHours(businessHours, scheduleName);

            schedulesForm.style.display = 'none';
            businessHoursForm.style.display = 'block';
        });

        // Create the Delete option
        const deleteOption = document.createElement('div');
        deleteOption.textContent = 'Delete';
        deleteOption.classList.add('dropdown-item');
        deleteOption.addEventListener('click', () => {
            table.deleteRow(row.rowIndex);
            deleteSchedule(schedule.scheduleId);



        });

        // Append options to dropdown
        dropdownMenu.appendChild(editOption);
        dropdownMenu.appendChild(deleteOption);

        // Append dropdown to action button

        dropdownWrapper.appendChild(dropdownMenu);
        actionCell.appendChild(actionButton);
        actionCell.appendChild(dropdownWrapper);

        // Toggle dropdown visibility
        actionButton.addEventListener('click', () => {
            dropdownMenu.style.display = dropdownMenu.style.display === 'none' ? 'block' : 'none';
        });

        document.addEventListener('click', function(event) {
            if (!actionCell.contains(event.target) && dropdownMenu.style.display === 'block') {
                dropdownMenu.style.display = 'none';
            }
        });

    });

}

async function updateScheduleInTable(scheduleName, scheduleId, businessHours, createdBy, oldrow) {

    const table = document.querySelector('#schedulesList table'); // Get the existing table
    table.deleteRow(oldrow.rowIndex);
    const row = table.insertRow(); // Insert a new row at the end of the table
    row.setAttribute('data-schedule-id', scheduleId);
    row.setAttribute('data-business-hours', JSON.stringify(businessHours));


    const rowData = [
        scheduleName,
        await getUserById(parseInt(createdBy, 10)),


    ];


    rowData.forEach((cellData, index) => {
        const cell = row.insertCell();
        cell.textContent = cellData;
    });


    const actionCell = row.insertCell();
    const actionButton = document.createElement('button');
    actionButton.textContent = '⋮'; // Vertical dots
    actionButton.classList.add('action-btn');

    // Create a dropdown menu for the action
    const dropdownWrapper = document.createElement('div');
    dropdownWrapper.classList.add('dropdown-wrapper');
    // Create a dropdown menu for the action
    const dropdownMenu = document.createElement('div');
    dropdownMenu.classList.add('dropdown-options');
    dropdownMenu.style.display = 'none';

    // Add event listener for the delete option
    const deleteOption = document.createElement('div');
    deleteOption.textContent = 'Delete';
    deleteOption.classList.add('dropdown-item');
    deleteOption.addEventListener('click', () => {
        table.deleteRow(row.rowIndex);
        deleteSchedule(schedule.scheduleId);

    });

    const editOption = document.createElement('div');
    editOption.textContent = 'Edit';
    editOption.classList.add('dropdown-item');

    editOption.addEventListener('click', () => {

        var cells = row.getElementsByTagName('td');
        const scheduleName = cells[0].innerText;
        editingRow = row;
        const businessHoursData = row.getAttribute('data-business-hours');
        const businessHours = JSON.parse(businessHoursData);
        initializeBusinessHours(businessHours, scheduleName);
        businessHoursForm.style.display = 'block';
        schedulesForm.style.display = 'none';

    });


    // Append the options to the dropdown menu
    dropdownMenu.appendChild(editOption);
    dropdownMenu.appendChild(deleteOption);
    dropdownWrapper.appendChild(dropdownMenu);

    // Append the dropdown to the action button
    actionCell.appendChild(actionButton);
    actionCell.appendChild(dropdownWrapper);
    // Toggle dropdown visibility on action button click
    actionButton.addEventListener('click', () => {
        dropdownMenu.style.display = dropdownMenu.style.display === 'none' ? 'block' : 'none';
    });

    // Close dropdown if clicked outside
    document.addEventListener('click', function(event) {
        if (!actionCell.contains(event.target) && dropdownMenu.style.display === 'block') {
            dropdownMenu.style.display = 'none';
        }
    });


}


function createTag(tagText) {

    const tagInput = document.getElementById('tagInput');
    const tag = document.createElement('div');
    tag.classList.add('tag');
    tag.textContent = tagText;

    // Create the 'x' remove button
    const removeTag = document.createElement('span');
    removeTag.textContent = 'x';
    removeTag.classList.add('remove-tag');

    // Function to remove the tag
    removeTag.onclick = function() {
        tag.remove();
    };

    // Append the 'x' button to the tag
    tag.appendChild(removeTag);

    // Append the tag inside the tagsContainer (before the input field)
    tagsContainer.appendChild(tag);
    tagInput.value = '';
}

function initializeRecipientsList(recipients) {
    if (recipients) {
        recipientsList = recipients;
        recipientsList.forEach(item => {
            // Create a tag for each recipient
            const tag = document.createElement('div');
            tag.classList.add('tag');
            tag.textContent = item.name;
            tag.id = item.type;

            selectedItems.push(item.id);
            // Create a remove button for the tag
            const removeButton = document.createElement('span');
            removeButton.className = 'remove-tag';
            removeButton.textContent = 'x'; // X icon for removing
            removeButton.addEventListener('click', function() {

                tag.remove();
                const index = selectedItems.indexOf(item.id);

                if (index !== -1) {
                    selectedItems.splice(index, 1);
                    recipientsList.splice(index, 1);
                }
                const listItem = findListItemById(item.id);
                if (listItem) {
                    listItem.classList.remove('selected'); // Unselect the list item
                }
                validateFields();
            });

            // Append remove button to the tag
            tag.appendChild(removeButton);
            // Append the tag to the container
            selectedRecipientsContainer.appendChild(tag);
        });

        validateFields();

        // Wait until options are populated before updating selections


        updateGroupSelection(group1Items, 'Group'); // For group1Options (Group type)
        updateGroupSelection(group2Items, 'User'); // For group2Options (User type)
        updateGroupSelection(group3Items, 'placeHolder'); // For group3Options (placeHolder type)
    }
}



function findListItemById(id) {
    // Look in all groups: group1Options, group2Options, group3Options
    let listItems = [...document.getElementById('group1Options').getElementsByTagName('li'),
        ...document.getElementById('group2Options').getElementsByTagName('li'),
        ...document.getElementById('group3Options').getElementsByTagName('li')
    ];

    return Array.from(listItems).find(item => item.getAttribute('data-value') === id);
}


async function extractRecipientsInfo(recipients) {


    const groupNames = recipients
        .filter(recipient => recipient.type === 'Group')
        .map(group => group.name)
        .join(', ');


    const placeHolders = recipients
        .filter(recipient => recipient.type === 'placeHolder')
        .map(item => item.name)
        .join(', ');


    const userCount = recipients
        .filter(recipient => recipient.type === 'User')
        .length;

    // Prepare the recipients string
    const recipientsInfo = groupNames ?
        `${groupNames}` + (placeHolders ? ` ,${placeHolders}` : '') + (userCount > 0 ? ` (Users: ${userCount})` : '') :
        placeHolders ?
        `${placeHolders}` + (userCount > 0 ? ` (Users: ${userCount})` : '') :
        userCount > 0 ?
        `Users: ${userCount}` :
        '';
    return recipientsInfo;
}

function getUserById(userId) {
    const options = {
        url: `/api/v2/users/${userId}`,
        type: 'GET',
        cors: false,
    };

    return client.request(options)
        .then((response) => {
            const userName = response.user && response.user.name;
            return userName || null;
        })
        .catch((error) => {
            console.error("Failed to fetch user:", error);
            return null;
        });
}

function getAccountTimeZone() {
    const options = {
        url: `/api/v2/account/settings`,
        type: 'GET',
        cors: false,
    };

    return client.request(options)
        .then((response) => {

            const timeZone = response.settings.localization.iana_time_zone;
            return timeZone || null;
        })
        .catch((error) => {
            console.error("Failed to fetch user:", error);
            return null;
        });
}



function deleteTrigger(ruleId) {



    return client.request({
        url: `/api/v2/triggers/${ruleId}`,
        type: 'DELETE',
        contentType: 'application/json'

    }).then(response => {

    }).catch(error => {
        // console.error(error);
    });


}




function getSLARules(domainName) {
    const payload = {
        payload: {
            Key: {
                "subdomain": domainName,
            }
        }
    };

    return client.request({
        url: 'https://gk719hb5uf.execute-api.us-east-1.amazonaws.com/SLA/get_SLA_Rules',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(payload)
    }).then(response => {
        const responseBody = JSON.parse(response.body);
        if (response.statusCode === 200) {
            return responseBody.rules || []; // Return rules array
        } else {
            return []; // Return empty array on error
        }
    }).catch(error => {
        console.error('Error fetching rules:', error);
        return []; // Return empty array on error
    });
}


async function updateSLARuleInTable(ruleName, ruleDesc, ruleType, scheduleId, responseTime, warningTime, ruleId, createdBy, oldrow, recipients, subject, body, tags, onBreachTrigger) {
    const table = document.querySelector('#rules table'); // Get the existing table
    table.deleteRow(oldrow.rowIndex);
    const row = table.insertRow(); // Insert a new row at the end of the table
    row.setAttribute('data-rule-id', ruleId);
    row.setAttribute('data-breachedTrigger-id', onBreachTrigger);
    row.setAttribute('schedule-id', scheduleId);
    const ruleTypeMapping = {
        calendar: "Calendar",
        businessHours: "Business Hours"
    };

    var recipientsInfo = await extractRecipientsInfo(recipients);

    const rowData = [
        ruleName,
        ruleDesc, // Trigger name from the modal save event
        ruleTypeMapping[ruleType] || ruleType,
        responseTime,
        warningTime,
        await getUserById(createdBy), // Subject from the modal save event
        recipientsInfo,
        body,
        subject,
        tags.join()

    ];


    rowData.forEach((cellData, index) => {
        const cell = row.insertCell();
        cell.textContent = cellData;


    });



    const actionCell = row.insertCell();
    const actionButton = document.createElement('button');
    actionButton.textContent = '⋮'; // Vertical dots
    actionButton.classList.add('action-btn');

    // Create a dropdown menu for the action
    const dropdownMenu = document.createElement('div');
    dropdownMenu.classList.add('dropdown-menu');
    dropdownMenu.style.display = 'none'; // Initially hidden


    const editTriggerOption = document.createElement('div');
    editTriggerOption.textContent = 'Edit Trigger';
    editTriggerOption.classList.add('dropdown-item');

    // Add event listener for the click event to open the edit URL
    editTriggerOption.addEventListener('click', () => {
        const address = `https://${subdomain}.zendesk.com/admin/objects-rules/rules/triggers/${ruleId}`;
        window.open(address, '_blank'); // Open the URL in a new tab
    });

    // Create the Delete option
    const deleteOption = document.createElement('div');
    deleteOption.textContent = 'Delete';
    deleteOption.classList.add('dropdown-item');

    // Add event listener for the delete option
    deleteOption.addEventListener('click', () => {

        table.deleteRow(row.rowIndex);
        deleteSLARule(subdomain, ruleId);
        deleteTrigger(ruleId);
        deleteTrigger(onBreachTrigger);

    });

    const editOption = document.createElement('div');
    editOption.textContent = 'Edit';
    editOption.classList.add('dropdown-item');

    editOption.addEventListener('click', () => {

        var cells = row.getElementsByTagName('td');
        var ruleName = cells[0].innerText;
        var ruleDesc = cells[1].innerText;
        var ruleType = cells[2].innerText.toLowerCase();
        var totalTime = cells[3].innerText;
        var warningTime = cells[4].innerText;
        breachEmailSubject.value = cells[5].innerText;
        breachEmailBody.value = cells[6].innerText;
        ruleNameField.value = ruleName;
        ruleDescField.value = ruleDesc;
        document.getElementById('response-time').value = totalTime;
        document.getElementById('warning-time').value = warningTime;

        ruleTypes.value = ruleType;

        scheduleSelect.value = scheduleId || 0;

        tags.forEach(tag => {
            createTag(tag);
        });

        initializeRecipientsList(recipients);
        editingRow = row;
        rulesForm.style.display = 'none';
        ruleTemplate.style.display = 'block';

    });


    dropdownMenu.appendChild(editTriggerOption);
    // Append the options to the dropdown menu
    dropdownMenu.appendChild(editOption);
    dropdownMenu.appendChild(deleteOption);

    // Append the dropdown to the action button
    actionCell.appendChild(actionButton);
    actionCell.appendChild(dropdownMenu);
    // Toggle dropdown visibility on action button click
    actionButton.addEventListener('click', () => {
        dropdownMenu.style.display = dropdownMenu.style.display === 'none' ? 'block' : 'none';
    });

    // Close dropdown if clicked outside
    document.addEventListener('click', function(event) {
        if (!actionCell.contains(event.target) && dropdownMenu.style.display === 'block') {
            dropdownMenu.style.display = 'none';
        }
    });
}


function resetForm() {
    ruleNameField.value = "";
    ruleDescField.value = "";
    breachEmailSubject.value = "";
    breachEmailBody.value = "";
    ruleTypes.selectedIndex = 0;
    scheduleSelect.selectedIndex = 0;
    tagsContainer.innerHTML = '';

    selectedRecipientsContainer.innerHTML = '';
    Array.from(group1Items).forEach(li => {
        li.classList.remove('selected');
    });
    Array.from(group2Items).forEach(li => {
        li.classList.remove('selected');
    });
    Array.from(group3Items).forEach(li => {
        li.classList.remove('selected');
    });
}