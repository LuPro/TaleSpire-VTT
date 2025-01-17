// TS.realtime.onSyncMessage((message, source) => {
//     // Check if the message is from the PlayerScript
//     if (source === "PlayerScript") {
//         // Process the message, e.g., extract the roll result and update the UI
//         const rollResult = extractRollResult(message);
//         // Update the DMScript UI with the roll result
//     }
// });

function extractRollResult(message) {
    console.log(message)
    // Implement a function to extract the roll result from the message
    // You might need to parse the message to get the roll result.
    // For example, you can use regular expressions or string manipulation.
    // The message might be something like "Player rolled a 4 on the dice".
    // Extract the number (4) and return it as the roll result.
    // This will depend on the format of your messages.
}

let monsterNames
let monsterData


function establishMonsterData(){
    const monsterDataObject = AppData.monsterLookupInfo;
    monsterNames = monsterDataObject.monsterNames;
    monsterData = monsterDataObject.monsterData;
    loadAndSetLanguage()
}

async function loadAndSetLanguage(){
    setLanguage(savedLanguage);
}

const messageHandlers = {
    'request-stats': handleRequestedStats,
    'update-health': handleUpdatePlayerHealth,
    'apply-damage': handleApplyMonsterDamage,
    'update-init' : handleUpdatePlayerInitiative,
    'request-init-list' : handleRequestInitList,
    // Add more as needed
};




function handleMessage(message) {
    const parsedMessage = JSON.parse(message);
    const { type, uuid, data, from } = parsedMessage;

    // Check if there's a handler for the message type
    if (messageHandlers[type]) {
        messageHandlers[type](parsedMessage);
    } else {
        console.error(`Unhandled message type: ${type}`);
    }
}






const playerCharacters = [
    // { name: 'Custom', hp: { current: 40, max: 40 }, ac: 14, initiative: 0 ,passivePerception: 0, spellSave: 12}
];

// Initialize the tracker (Removed initial call to renderMonsterCards())

// Event listener for adding a new empty monster card
document.getElementById('add-monster-button').addEventListener('click', function() {
    createEmptyMonsterCard();
    closePopup()
});

// Event listener for saving each encounter
document.getElementById('save-encounter').addEventListener('click', function() {
    const savePopup = document.querySelector('.save-popup');
    if (savePopup) {
        closePopup(); // Close the popup if it's open
    } else {
        showSavePopup(); // Show the save popup if it's not open
    }
});

// Event listener for loading each encounter
document.getElementById('load-encounter').addEventListener('click', function() {
    const loadPopup = document.querySelector('.load-popup');
    if (loadPopup) {
        closePopup(); // Close the popup if it's open
    } else {
        loadEncountersAndPopulateCards(); // Show the load popup if it's not open
    }
});

document.getElementById('rollInitiative').addEventListener('click', () => {
    const monsterCards = document.querySelectorAll('.monster-card');

    monsterCards.forEach(card => {
        // Find the element with the data-name="Initiative"
        const initiativeElement = card.querySelector('[data-name="Initiative"]');
        if (initiativeElement) {
            const diceType = initiativeElement.getAttribute('data-dice-type');
            
            // Use regex to extract the modifier part, which could be positive or negative
            const match = diceType.match(/1d20([+-]\d+)/);

            // Default initMod to 0 if no modifier is found
            const initMod = match ? parseInt(match[1], 10) : 0;
            const randomRoll = Math.floor(Math.random() * 20) + 1;
            const totalInitiative = randomRoll + initMod;
            const initInput = card.querySelector('.init-input');

            if (initInput) {
                initInput.value = totalInitiative;
            } else {
                console.log(`Initiative for ${card.id}: ${totalInitiative}`);
            }
        }
    });
    reorderCards()
});



let currentTurnIndex = 0; // Track the current turn
let roundCounter = 1; // Track rounds
document.getElementById('next-turn-btn').addEventListener('click', nextTurn);
document.getElementById('previous-turn-btn').addEventListener('click', previousTurn);
makeRoundEditable() //Adding an event listener to the round counter to allow editing the round. 


function activateMonsterCard(card){
    if (activeMonsterCard) {
        activeMonsterCard.style.borderColor = ''; // Reset to default border color
    }

    // Set this card as the active card
    activeMonsterCard = card;

    // Change the border color of the active card to red
    card.style.borderColor = 'red';
}

function createEmptyMonsterCard() {
    // Create the monster card container
    const card = document.createElement('div');
    card.classList.add('monster-card');

    // Add click event listener to the card to set it as active
    card.addEventListener('click', () => {
        // If there's an active card, reset its border to the default
        activateMonsterCard(card)
    });

    // Create the dropdown container
    const dropdownContainer = document.createElement('div');
    dropdownContainer.classList.add('dropdown-container');

    // Create the input field for monster names
    const nameInput = document.createElement('input');
    nameInput.classList.add('monster-name-input');
    nameInput.placeholder = 'Select or type a monster name...';

    // Create the dropdown list
    const monsterList = document.createElement('ul');
    monsterList.classList.add('monster-list');

    // Populate the dropdown list with monster names
    monsterNames.forEach(monsterName => {
        const listItem = document.createElement('li');
        listItem.textContent = monsterName;
        listItem.addEventListener('click', () => {
            // Find the selected monster
            const selectedMonster = monsterName;

            // Update the monster card with selected monster's details
            updateMonsterCard(card, selectedMonster);

            // Hide the dropdown after selection
            monsterList.style.display = 'none';
        });
        monsterList.appendChild(listItem);
    });

    // Add event listener to show/hide the dropdown list
    nameInput.addEventListener('focus', () => {
        monsterList.style.display = 'block'; // Show dropdown on focus
    });

    // Add event listener to filter the dropdown list
    nameInput.addEventListener('input', () => {
        const filterText = nameInput.value.toLowerCase();
        monsterList.querySelectorAll('li').forEach(li => {
            const monsterName = li.textContent.toLowerCase();
            li.style.display = monsterName.includes(filterText) ? 'block' : 'none';
        });
    });

    // Hide the dropdown when clicking outside of it
    document.addEventListener('click', (event) => {
        if (!dropdownContainer.contains(event.target)) {
            monsterList.style.display = 'none';
        }
    });

    // Append elements to the card
    dropdownContainer.appendChild(nameInput);
    dropdownContainer.appendChild(monsterList);
    card.appendChild(dropdownContainer);

    // Append the card to the container
    const tracker = document.getElementById('initiative-tracker');
    if (tracker) {
        tracker.appendChild(card);
    } else {
        console.error('Initiative tracker container not found.');
    }

    return card
}



function updateMonsterCard(card, monster) {
    // Clear previous content
    card.innerHTML = '';

    // Check if the monster is a string (name) or an object (full monster data)
    let monsterName, selectedMonsterData, monsterCurrentHp, monsterMaxHp, monsterTempHP, newConditionsMap, monsterVisable
    
    if (typeof monster === 'string') {
        // If a string is provided, it's just the monster name, so we fetch the data
        monsterName = monster;
        selectedMonsterData = monsterData[monster]; // Look up monster data by name

        monsterCurrentHp = selectedMonsterData.HP.Value
        monsterMaxHp = selectedMonsterData.HP.Value
        monsterTempHP = 0;
        monsterVisable = 0;

    } else if (typeof monster === 'object') {
        // If an object is provided, use the data from the monster object that we loaded
        monsterName = monster.name;  // Name from the object
        const rearrangedName = monsterName.replace(/\s\([A-Z]\)$/, ''); // Removes the letter in parentheses
        selectedMonsterData = monsterData[rearrangedName]; // Get the stored monster data based on the name
    
        monsterCurrentHp = monster.currentHp;
        monsterMaxHp = monster.maxHp;
        monsterTempHP = monster.tempHp;
        newConditionsMap = monster.conditions;
        monsterVisable = monster.isClosed;
    }
    

    // Handle missing monster data
    if (!selectedMonsterData) {
        console.error(`Monster data not found for: ${monsterName}`);
        return;
    }

    // Create the monster initiative box
    const initDiv = document.createElement('div');
    initDiv.classList.add('monster-init');
    
    const initInput = document.createElement('input');
    initInput.type = 'number';
    initInput.value = monster.init || 0; // Use initiative from the object, if available
    initInput.classList.add('init-input');
    initInput.addEventListener('change', () => reorderCards());
    initDiv.appendChild(initInput);

    // Add monster picture
    const monsterPictureDiv = document.createElement('div');
    monsterPictureDiv.classList.add('monster-picture-div');
    const monsterPicture = document.createElement('img');
    monsterPicture.classList.add('monster-picture');
    monsterPictureDiv.appendChild(monsterPicture);

    // Monster info section
    const monsterInfo = document.createElement('div');
    monsterInfo.classList.add('monster-info');
    const monsterNameDiv = document.createElement('div');
    monsterNameDiv.classList.add('monster-name');

    // Determine the monster name to use
    let monsterNameToUse 
    if(monster.name){
        monsterNameDiv.textContent = monster.name
    }
    else{
        monsterNameToUse = selectedMonsterData.Name
        const existingNames = Array.from(document.getElementsByClassName('monster-name')).map(nameElem => nameElem.textContent.replace(/\s\([A-Z]\)$/, ''));
        const count = existingNames.filter(name => name === monsterNameToUse).length;
        monsterNameDiv.textContent = `${monsterNameToUse} (${String.fromCharCode(65 + count)})`;
    }

    // Add a unique identifier to the monster name


    
    monsterNameDiv.addEventListener('click', function () {
        const monsterNameText = monsterNameDiv.textContent.replace(/\s\([A-Z]\)$/, '');
        console.log(monsterNameText)
        showMonsterCardDetails(monsterNameText);
    });

    // Stats section (AC, Initiative, Speed)
    const statsDiv = document.createElement('div');
    statsDiv.classList.add('monster-details');
    let monsterInitiative
    if(selectedMonsterData.InitiativeModifier < 0){
        monsterInitiative = selectedMonsterData.InitiativeModifier;
    }
    else{
        monsterInitiative = "+" + selectedMonsterData.InitiativeModifier;
    }
    
    const initiativeButton = parseAndReplaceDice({ name: 'Initiative' }, `Init Mod: ${monsterInitiative} <br>`);
    
    const statsSpan = document.createElement('span');
    const acText = document.createTextNode(`AC: ${selectedMonsterData.AC.Value} | `);
    const speedText = document.createTextNode(` Speed: ${selectedMonsterData.Speed}`);
    statsSpan.appendChild(acText);
    statsSpan.appendChild(initiativeButton);
    statsSpan.appendChild(speedText);
    statsDiv.appendChild(statsSpan);

    // Add monster name and stats to the monster info
    monsterInfo.appendChild(monsterNameDiv);
    monsterInfo.appendChild(statsDiv);

    const conditionsDiv = document.createElement('div');
    conditionsDiv.classList.add('conditions-trackers');

    card.appendChild(initDiv);
    card.appendChild(monsterPictureDiv);
    card.appendChild(monsterInfo);
    card.appendChild(conditionsDiv);

    // Add conditions from the newConditionsMap back to the card
    if (Array.isArray(newConditionsMap)) {
        newConditionsMap.forEach(conditionName => {
            // Call monsterConditions directly with the condition name
            // This assumes monsterConditions has been modified to accept a condition name
            if (conditionName) {
                activeMonsterCard = card; // Set the active monster card to the current one
                monsterConditions(conditionName); // Call with context and value
            }
        });
    }


    // HP section
    const monsterHP = document.createElement('div');
    monsterHP.classList.add('monster-hp');

    const currentHPDiv = document.createElement('span');
    currentHPDiv.classList.add('current-hp');
    currentHPDiv.contentEditable = true;
    currentHPDiv.textContent = monsterCurrentHp

    const maxHPDiv = document.createElement('span');
    maxHPDiv.classList.add('max-hp');
    maxHPDiv.contentEditable = true;
    maxHPDiv.textContent = monsterMaxHp  // Use maxHp from the object, if available

    const hpDisplay = document.createElement('div');
    hpDisplay.classList.add('hp-display');
    hpDisplay.appendChild(currentHPDiv);
    hpDisplay.appendChild(document.createTextNode(' / '));
    hpDisplay.appendChild(maxHPDiv);
    
    const hpAdjustInput = document.createElement('input');
    hpAdjustInput.type = 'number';
    hpAdjustInput.classList.add('hp-adjust-input');
    hpAdjustInput.placeholder = 'Math';
    
    const tempHPDiv = document.createElement('span');
    tempHPDiv.classList.add('temp-hp');
    tempHPDiv.contentEditable = true;
    tempHPDiv.textContent = monsterTempHP || 0;  // Use tempHp from the object, if available
    
    const tempHPContainer = document.createElement('div');
    tempHPContainer.classList.add('temp-hp-container');
    tempHPContainer.appendChild(document.createTextNode('Temp: '));
    tempHPContainer.appendChild(tempHPDiv);
    
    // Add event listener for HP adjustment
    hpAdjustInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            const adjustment = parseInt(hpAdjustInput.value, 10);
            if (isNaN(adjustment)) return;
    
            let currentHP = parseInt(currentHPDiv.textContent, 10) || 0;
            const maxHP = parseInt(maxHPDiv.textContent, 10) || selectedMonsterData.HP.Value;
            let tempHP = parseInt(tempHPDiv.textContent, 10) || 0;  // Get current temp HP
    
            // Subtract from temp HP first, then from current HP if temp HP is depleted
            if (adjustment < 0) { // Damage case
                let damage = Math.abs(adjustment);
    
                // Subtract damage from temp HP first
                if (tempHP > 0) {
                    const tempHPRemainder = tempHP - damage;
                    if (tempHPRemainder >= 0) {
                        tempHP = tempHPRemainder;
                        damage = 0;
                    } else {
                        damage -= tempHP; // Subtract remaining damage after temp HP is depleted
                        tempHP = 0;
                    }
                }
    
                // If there's still damage left, subtract from current HP
                if (damage > 0) {
                    currentHP = Math.max(0, currentHP - damage);
                }
                
                if (activeMonsterCard) {
                    // Find the condition tracker div inside the active monster card
                    conditionTrackerDiv = activeMonsterCard.querySelector('.condition-tracker');
                    console.log()

                    // Retrieve the condition set from the conditions map for this specific monster
                    conditionsSet = conditionsMap.get(activeMonsterCard);

                    if (!conditionsSet) {
                        console.log('No conditions set for this monster yet.');
                    } else {
                        if (conditionsSet.has('Concentration')) {
                            const dc = Math.max(10, Math.ceil(damage / 2));
                            showErrorModal(`Roll a Con save. <br> DC: ${dc}`,1000);
                        }
                    }
                } else {
                    console.log('No active monster selected.');
                    conditionTrackerDiv = document.getElementById('conditionTracker');
                    conditionsSet = conditionsMap.get(conditionTrackerDiv);
                }
            } else if (adjustment > 0) { // Healing case
                currentHP = Math.min(maxHP, currentHP + adjustment); // Heal current HP, but no effect on temp HP
            }
    
            // Update HP and temp HP displays
            currentHPDiv.textContent = currentHP;
            tempHPDiv.textContent = tempHP;
    
            hpAdjustInput.value = '';  // Clear input
        }
    });
    
    monsterHP.appendChild(hpDisplay);
    monsterHP.appendChild(tempHPContainer);
    monsterHP.appendChild(hpAdjustInput);

    const eyeAndCloseDiv = document.createElement('div');
    eyeAndCloseDiv.classList.add('eye-and-close-buttons');

    // Open Eye Button
    const openEyeButton = document.createElement('button');
    openEyeButton.classList.add('eye-button');
    openEyeButton.classList.add('nonRollButton');
    if (monsterVisable === 0){
        openEyeButton.innerHTML = '<i class="fa fa-eye" aria-hidden="true"></i>';
    }
    else{
        openEyeButton.innerHTML = '<i class="fa fa-eye-slash" aria-hidden="true"></i>';
    }

    
    
    openEyeButton.addEventListener('click', () => {
        // Toggle between open and closed eye
        if (openEyeButton.querySelector('i').classList.contains('fa-eye')) {
            openEyeButton.innerHTML = '<i class="fa fa-eye-slash" aria-hidden="true"></i>';
        } else {
            openEyeButton.innerHTML = '<i class="fa fa-eye" aria-hidden="true"></i>';
        }
        debouncedSendInitiativeListToPlayer();
    });



    // Delete button
    const deleteButtonDiv = document.createElement('div');
    deleteButtonDiv.classList.add('monster-card-delete-button');
    const deleteButton = document.createElement('button');
    deleteButton.classList.add('nonRollButton');
    deleteButton.textContent = "X";
    deleteButton.addEventListener('click', () => {
        card.remove();
        reorderCards();
    });

    deleteButtonDiv.appendChild(deleteButton);

    eyeAndCloseDiv.appendChild(openEyeButton);
    eyeAndCloseDiv.appendChild(deleteButtonDiv);

    // Add all components to the card in a consistent layout
    card.appendChild(monsterHP);
    card.appendChild(eyeAndCloseDiv);
    
    reorderCards();
    rollableButtons();  // Update rollable buttons after card updates
}




// Event listener for hiding the monster stat block
document.getElementById('closeMonsterCard').addEventListener('click', function() {
    toggleMonsterCardVisibility(false);
});


let currentSelectedMonsterName = '';

function showMonsterCardDetails(monsterName) {
    // Check if the monster card is currently visible
    const monsterCardContainer = document.getElementById('monsterCardContainer');

    if (monsterCardContainer.classList.contains('visible') && currentSelectedMonsterName === monsterName) {
        // Hide the card if it's already open
        toggleMonsterCardVisibility(false);
        return; // Exit the function early
    }

    console.log(monsterName)

    // Find the monster in the new data source monsterData
    const monster = monsterData[monsterName];

    console.log(monster)

    if (monster) {
        currentSelectedMonsterName = monsterName;

        // Populate all fields
        populateMonsterFields(monster);

        // Show the monster card container
        toggleMonsterCardVisibility(true);
    } else {
        console.error(`Monster data not found for: ${monsterName}`);
    }
}


// Toggles the visibility of the monster card
function toggleMonsterCardVisibility(isVisible) {
    const monsterCardContainer = document.getElementById('monsterCardContainer');
    if (isVisible) {
        monsterCardContainer.classList.remove('hidden');
        monsterCardContainer.classList.add('visible');
    } else {
        monsterCardContainer.classList.remove('visible');
        monsterCardContainer.classList.add('hidden');
    }
}

// Reusable function to populate data conditionally
function populateField(elementId, label, value, isRollable = false) {
    const element = document.getElementById(elementId);

    if (value || value === 0) {
        const labelText = label ? `<strong>${label}:</strong> ` : ''; // Add colon and break only if label exists

        if (isRollable) {
            // Use parseAndReplaceDice to handle rollable text
            element.innerHTML = ''; // Clear the element content
            const parsedContent = parseAndReplaceDice({ name: label }, value, true);
            const labelNode = document.createElement('span');
            labelNode.innerHTML = labelText;
            element.appendChild(labelNode);
            element.appendChild(parsedContent);
        } else {
            if (value || value === 0) {
                // Only add colon if label is non-empty
                const labelText = label ? `<strong>${label}:</strong> ` : '';
                if (isRollable) {
                    element.innerHTML = ''; // Clear content
                    const parsedContent = parseAndReplaceDice({ name: label }, value, true);
                    element.appendChild(document.createTextNode(labelText));
                    element.appendChild(parsedContent);
                } else {
                    const formattedValue = typeof value === 'string'
                        ? value.replace(/,\s*/g, ', ')
                        : Array.isArray(value) ? value.join(', ') : String(value);
                    element.innerHTML = `${labelText}${formattedValue}`;
                }
                element.style.display = 'block';
            } else {
                element.style.display = 'none';
            }
        }

        element.style.display = 'block';
    } else {
        element.style.display = 'none';
    }
}


// Populates monster fields
function populateMonsterFields(monster) {
    // Populate basic monster info

    populateField('monsterName', '', monster.Name);
    populateField('monsterType', '', monster.Type, false);
    populateField('monsterAC', 'Armor Class', monster.AC?.Value, false);
    console.log(monster.AC?.Value)
    populateField('monsterHP', 'HP', `${monster.HP?.Value} ${monster.HP?.Notes}`, true);
    populateField('monsterSpeed', 'Speed', monster.Speed);
    populateField('monsterLanguages', 'Languages', monster.Languages, false);
    populateField('monsterDamageVulnerabilities', 'Vulnerabilities', monster.DamageVulnerabilities, false);
    populateField('monsterDamageResistances', 'Resistances', monster.DamageResistances, false);
    populateField('monsterDamageImmunities', 'Immunities', monster.DamageImmunities, false);
    populateField('monsterConditionImmunities', 'Condition Immunities', monster.ConditionImmunities, false);
    populateField('monsterSenses', 'Senses', monster.Senses, false);
    populateField('monsterChallenge', 'CR', monster.Challenge, false);

    function checkAndPopulateSection(elementId, data, type) {
        const container = document.getElementById(elementId);
        container.innerHTML = ''; // Always clear previous content
    
        if (data && data.length > 0) {
            populateMonsterListField(elementId, data, type);
        }
    }
    
    populateMonsterListField('monsterAbilityScores', monster.Abilities, 'abilityScores');


    checkAndPopulateSection('monsterSkills', monster.Skills, 'skill');
    checkAndPopulateSection('monsterSaves', monster.Saves, 'savingThrow');
    checkAndPopulateSection('monsterActions', monster.Actions, 'action');
    checkAndPopulateSection('monsterReactions', monster.Reactions, 'action');
    checkAndPopulateSection('monsterAbilities', monster.Traits, 'traits');
    checkAndPopulateSection('monsterLegendaryActions', monster.LegendaryActions, 'legendaryAction');
    
    rollableButtons()
}



// Updated function to populate list fields with various item types
function populateMonsterListField(elementId, items, type) {
    const container = document.getElementById(elementId);
    container.innerHTML = ''; // Clear previous content

    // Check if items exist and are not empty
    if (items) {
        // Handle if items is an array (Actions, Legendary Actions, Skills, Saving Throws)
        if (Array.isArray(items) && items.length > 0) {
            items.forEach(item => {
                let itemContent;
                // Determine the item content based on the type
                switch (type) {
                    case 'traits':
                    case 'action':
                    case 'reaction':
                    case 'legendaryAction':
                        itemContent = parseAndReplaceDice({ name: item.Name }, `<strong>${item.Name}: </strong>${item.Content}`, true);
                        break;
                    case 'savingThrow':
                        const savemodifier = parseInt(item.Modifier) >= 0 ? `+${item.Modifier}` : item.Modifier;
                        itemContent = parseAndReplaceDice({ name: item.Name + " Save"}, `<strong>${item.Name} : </strong> ${savemodifier}`);
                        break;
                    case 'skill':
                        const skillmodifier = parseInt(item.Modifier) >= 0 ? `+${item.Modifier}` : item.Modifier;
                        itemContent = parseAndReplaceDice({ name: item.Name}, `<strong>${item.Name} : </strong> ${skillmodifier}`);
                        break;
                    default:
                        itemContent = document.createElement('div');
                        itemContent.textContent = item.Name || 'Unknown Item';
                }
                
                if (itemContent) {
                    container.appendChild(itemContent);

                    // Create and append a <br> element after each item
                    const lineBreak = document.createElement('br');
                    container.appendChild(lineBreak);
                }
            });
            container.style.display = '';
        }
        // Handle if items is an object (Ability Scores)
        else if (typeof items === 'object' && !Array.isArray(items)) {
            Object.keys(items).forEach(key => {
                const abilityScore = items[key];
                // Calculate the ability modifier
                const modifier = Math.floor((abilityScore - 10) / 2);
                const modifierText = modifier >= 0 ? `+${modifier}` : `${modifier}`; // Add "+" for positive numbers, no change for negative
        
                // Create a container for the ability score and rollable modifier
                const scoreElement = document.createElement('div');
        
                // Create the static part of the text (ability score)
                const staticText = document.createElement('strong');
                staticText.textContent = `${key} : `;
                scoreElement.appendChild(staticText);
                scoreElement.appendChild(document.createTextNode(`${abilityScore} `));
        
                // Use the parseAndReplaceDice function to make the modifier rollable, and append it
                const rollableModifier = parseAndReplaceDice({ name: key }, modifierText, true);
                scoreElement.appendChild(rollableModifier); // Appends the actual button or label returned by the function
        
                container.appendChild(scoreElement); // Append the entire scoreElement to the container
            });
            container.style.display = ''; // Ensure the container is displayed
        } else {
            container.style.display = 'none';
        }
        


    } else {
        container.style.display = 'none';
    }
}










// Event listener for adding a new empty player card
document.getElementById('add-player-button').addEventListener('click', async function() {
    // await fetchAndCreatePlayerCards();
    mergeOtherPlayers(playersInCampaign) ;
    createEmptyPlayerCard();
    closePopup();
    
});

// Function to create player cards
function createEmptyPlayerCard() {
    // Create the player card container
    const card = document.createElement('div');
    card.classList.add('player-card'); // Reuse monster-card class for styling

    // Create the dropdown container
    const dropdownContainer = document.createElement('div');
    dropdownContainer.classList.add('dropdown-container');

    // Create the input field for player names
    const nameInput = document.createElement('input');
    nameInput.classList.add('monster-name-input');
    nameInput.placeholder = 'Select or type a player name...';

    // Create the dropdown list
    const playerList = document.createElement('ul');
    playerList.classList.add('monster-list');

    // Populate the dropdown list with player names
    playerCharacters.forEach(player => {
        const listItem = document.createElement('li');
        listItem.textContent = player.name;
        listItem.addEventListener('click', () => {
            // Find the selected player
            const selectedPlayer = playerCharacters.find(p => p.name === listItem.textContent);

            // Update the card with selected player's details
            updatePlayerCard(card, selectedPlayer);

            // Hide the dropdown after selection
            playerList.style.display = 'none';
        });
        playerList.appendChild(listItem);
    });

    // Add event listener to show/hide the dropdown list
    nameInput.addEventListener('focus', () => {
        playerList.style.display = 'block'; // Show dropdown on focus
    });

    // Add event listener to filter the dropdown list
    nameInput.addEventListener('input', () => {
        const filterText = nameInput.value.toLowerCase();
        playerList.querySelectorAll('li').forEach(li => {
            const playerName = li.textContent.toLowerCase();
            li.style.display = playerName.includes(filterText) ? 'block' : 'none';
        });
    });

    // Hide the dropdown when clicking outside of it
    document.addEventListener('click', (event) => {
        if (!dropdownContainer.contains(event.target)) {
            playerList.style.display = 'none';
        }
    });

    // Append elements to the card
    dropdownContainer.appendChild(nameInput);
    dropdownContainer.appendChild(playerList);

    card.appendChild(dropdownContainer);

    // Append the card to the container
    const tracker = document.getElementById('initiative-tracker');
    if (tracker) {
        tracker.appendChild(card);
    } else {
        console.error('Initiative tracker container not found.');
    }

    return card
}

async function updatePlayerCard(card, player) {
     // Get current initiative value before clearing
     const currentInitInput = card.querySelector('.init-input');
     const currentInitiative = currentInitInput ? parseInt(currentInitInput.value) : 0;
 
     // Clear previous content
     card.innerHTML = '';
 
     console.log(player);
 
     if (player.talespireId) {
         card.dataset.playerId = player.talespireId; // Store player ID in dataset
     }
 
     const selectedPlayer = player.talespireId;
     if (selectedPlayer) {
        debouncedRequestPlayerInfo;
     }
 
     // Create and add player details
     const initDiv = document.createElement('div');
     initDiv.classList.add('monster-init');
 
     const initInput = document.createElement('input');
     initInput.type = 'number';
     // Set the initiative input value to the stored value or player data
     initInput.value = player.initiative !== undefined ? player.initiative : currentInitiative; 
     initInput.classList.add('init-input');
 
     // Event listener for initiative changes
     initInput.addEventListener('change', () => {
         reorderCards(); // Reorder cards when initiative is changed
     });
 
     initDiv.appendChild(initInput);

    const playerInfo = document.createElement('div');
    playerInfo.classList.add('player-info'); // Reuse monster-info class

    // Check if the player name is "Custom"
    if (player.name === "Custom") {
        // Create a container for the player info
        const playerInfoContainer = document.createElement('div');
        playerInfoContainer.classList.add('player-custom-info'); // Add player-info class for styling

        // Helper function to create label-input pairs
        function createLabelInputPair(labelText, inputType, inputId, placeholder) {
            const labelInputGroup = document.createElement('div');
            labelInputGroup.classList.add('label-input-group'); // Class to style the group

            const label = document.createElement('label');
            label.textContent = labelText;

            const input = document.createElement('input');
            input.type = inputType;
            input.id = inputId;
            input.placeholder = placeholder;

            // Append label and input to the group
            labelInputGroup.appendChild(label);
            labelInputGroup.appendChild(input);

            return labelInputGroup;
        }

        // Create and append all label-input pairs
        playerInfoContainer.appendChild(createLabelInputPair('Name:', 'text', 'customCharacterName', 'Character Name'));
        playerInfoContainer.appendChild(createLabelInputPair('HP:', 'number', 'customHP', 'HP'));
        playerInfoContainer.appendChild(createLabelInputPair('AC:', 'number', 'customAC', 'AC'));
        playerInfoContainer.appendChild(createLabelInputPair('Passive Per:', 'number', 'customPassivePerception', 'Per'));
        playerInfoContainer.appendChild(createLabelInputPair('Spell Save:', 'number', 'customSpellSaveDC', 'DC'));

        // Append the container to the playerInfo element
        playerInfo.appendChild(playerInfoContainer);
    }
 else {
        // Display existing player details
        const playerName = document.createElement('div');
        playerName.classList.add('monster-name'); // Reuse monster-name class
        playerName.innerText = player.name || player.characterName;

        // Create a new div to hold the player header (name and health)
        const playerHeader = document.createElement('div');
        playerHeader.classList.add('player-header'); // New class for header

        // Append player name to the header
        playerHeader.appendChild(playerName);

        // Create the player health div
        const playerHealthDiv = document.createElement('div');
        playerHealthDiv.classList.add('player-health');
        playerHealthDiv.innerHTML = `<span>HP: ${player.hp.current} / ${player.hp.max}</span>`;

        // Append player health to the header
        playerHeader.appendChild(playerHealthDiv);

        // Create stats div
        const statsDiv = document.createElement('div');
        statsDiv.classList.add('player-stats');
        statsDiv.innerHTML = `
            <span>AC: ${player.ac}</span>
            <span>Passive Per: ${player.passivePerception}</span>
            <span>Spell Save: ${player.spellSave}</span>
            <div class="player-stats-filler"></div>
        `;

        // Append header and stats div to playerInfo
        playerInfo.appendChild(playerHeader);
        playerInfo.appendChild(statsDiv);

    }

    const deleteButtonDiv = document.createElement('div');
    deleteButtonDiv.classList.add('monster-card-delete-button');
    const deleteButton = document.createElement('button');
    deleteButton.classList.add('nonRollButton');
    deleteButton.textContent = "X";
    deleteButton.addEventListener('click', () => {
        card.remove();
        reorderCards();
    });

    deleteButtonDiv.appendChild(deleteButton);

    card.appendChild(initDiv);
    card.appendChild(playerInfo);
    card.appendChild(deleteButtonDiv);

    // Re-append the dropdown container to the card
    const dropdownContainer = card.querySelector('.dropdown-container');
    if (dropdownContainer) {
        card.appendChild(dropdownContainer);
    }

    reorderCards();
}





// Fetch players on the board and populate the dropdown

// Function to merge other players into the playerCharacters array
function mergeOtherPlayers(otherPlayers) {
    try {
        // Flatten the array of arrays into a single array of player objects
        const flattenedPlayers = otherPlayers.flat();

        // Iterate over each player object in the flattened array
        flattenedPlayers.forEach(entry => {
            const player = entry; // Access the player object inside each entry

            console.log(player.id)

            // Check if the player already exists in the playerCharacters array
            const playerExists = playerCharacters.some(p => p.name === player.name);

            // If the player doesn't exist, add them with default stats
            if (!playerExists) {
                playerCharacters.push({
                    name: player.name,
                    hp: { current: 50, max: 50 }, // Default HP values (adjust as needed)
                    ac: 10, // Default AC (adjust as needed)
                    initiative: 0,
                    talespireId: player.id // Use clientId for talespireId
                });
            }
        });
        console.log("Players merged successfully:", playerCharacters);
    } catch (error) {
        console.error("Error merging other players:", error);

        // Fallback: Safely continue without adding players
        console.warn("No players were merged due to an error.");
    }
}





function reorderCards() {
    const tracker = document.getElementById("initiative-tracker");
    
    // Ensure tracker exists
    if (!tracker) {
        console.error("Initiative tracker element not found.");
        return;
    }
    
    // Retrieve all cards
    const cards = Array.from(tracker.querySelectorAll(".monster-card, .player-card"));;
    
    // Check if cards array is empty
    if (cards.length === 0) {
        console.warn("No monster cards to reorder.");
        return;
    }
    
    // Sort the cards based on initiative
    cards.sort((a, b) => {
        const aInit = parseInt(a.querySelector(".init-input")?.value, 10) || 0;
        const bInit = parseInt(b.querySelector(".init-input")?.value, 10) || 0;
        return bInit - aInit; // Higher initiative first
    });
    
    // Remove existing cards and append them back in the correct order
    cards.forEach(card => {
        tracker.appendChild(card);
    });

    currentTurnIndex = 0;
    highlightCurrentTurn();

    debouncedSendInitiativeListToPlayer();
}

const debouncedSendInitiativeListToPlayer = debounce(sendInitiativeListToPlayer, 1000);
const debouncedRequestPlayerInfo = debounce(requestPlayerInfo, 1000); // 300ms delay

//Event listener for the request player stats button. Should broadcast to all players for stats. 
document.getElementById("request-player-stats").addEventListener("click", debouncedRequestPlayerInfo);


function debounce(func, delay) {
    let timeoutId;
    return (...args) => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    };
}

let currentMonsterCard

// Function to highlight the current card
function highlightCurrentTurn() {
    const tracker = document.getElementById("initiative-tracker");

    // Remove 'current-turn' from all cards
    const allCards = tracker.querySelectorAll(".monster-card, .player-card");
    allCards.forEach(card => {
        card.classList.remove('current-turn');
    });

    // Add 'current-turn' to the active card
    const currentCard = tracker.querySelectorAll(".monster-card, .player-card")[currentTurnIndex];
    if (currentCard) {
        currentCard.classList.add('current-turn');
        currentMonsterCard = currentCard
    }

    debounce(sendInitiativeTurn(currentTurnIndex), 1000);
}

// Function to update the round display
function updateRoundDisplay() {
    const roundDisplay = document.getElementById('round-counter');
    roundDisplay.textContent = `Round: ${roundCounter}`;
    sendInitiativeRound()
}


// Function to advance to the next turn
function nextTurn() {
    const tracker = document.getElementById("initiative-tracker");
    const cards = tracker.querySelectorAll(".monster-card, .player-card");

 

    if (currentMonsterCard) {
        // Find the condition tracker div inside the active monster card
        conditionTrackerDiv = currentMonsterCard.querySelector('.condition-tracker');
        console.log(conditionTrackerDiv)

        // Retrieve the condition set from the conditions map for this specific monster
        conditionsSet = conditionsMap.get(currentMonsterCard);
        console.log(conditionsSet)

        if (!conditionsSet) {
            console.log('No conditions set for this monster yet.');
        } else {
            if (conditionsSet.has('Recharging')) {
                showErrorModal(`Roll Recharge`,1000);
            }
        }
    } else {
        console.log('No active monster selected.');
        conditionTrackerDiv = document.getElementById('conditionTracker');
        conditionsSet = conditionsMap.get(conditionTrackerDiv);
    }

    // Increment the turn index
    currentTurnIndex++;

    // If the index goes beyond the last card, reset to the first card and increment the round counter
    if (currentTurnIndex >= cards.length) {
        currentTurnIndex = 0; // Reset to the first card
        roundCounter++; // Increment the round
        updateRoundDisplay(); // Update the round counter
    }

    highlightCurrentTurn(); // Highlight the current card
}

function previousTurn() {
    const tracker = document.getElementById("initiative-tracker");
    const cards = tracker.querySelectorAll(".monster-card, .player-card");

    // Increment the turn index
    currentTurnIndex--;

    if (currentTurnIndex < 0) {
        currentTurnIndex = 0; // Reset to the first card
    }
    else{
        highlightCurrentTurn(); // Highlight the current card
    }

    
}

function makeRoundEditable() {
    const roundElement = document.getElementById('round-counter');

    roundElement.addEventListener('blur', function (event) {
        let currentText = roundElement.textContent;

        // Remove non-numeric characters (except for the "Round: " text)
        const numericValue = currentText.replace(/[^0-9]/g, '');

        // Only update if the value is a valid positive number or empty (to avoid invalid input)
        if (numericValue !== '' && !isNaN(numericValue)) {
            roundElement.textContent = `Round: ${numericValue}`;
            roundCounter = parseInt(numericValue, 10); // Update the round counter variable
        } else {
            // Restore the last valid round number if invalid input
            roundElement.textContent = `Round: ${roundCounter}`;
        }
    });

    

    // Ensure the round starts with a valid value
    roundElement.textContent = `Round: ${roundCounter}`;

    roundElement.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
            roundElement.blur(); // Blur the element when Enter is pressed
        }
    });
}





const conditionsMap = new Map();

// Function to handle adding conditions to the active monster
function monsterConditions(condition) {

    console.log(condition)
    let selectedCondition
    if (condition){
        selectedCondition = condition;
    }
    else{
        const conditionSelect = document.getElementById('condition-select');
        selectedCondition = conditionSelect.value;
    }
    

    // Ensure a condition is selected and there's an active monster
    if (selectedCondition && activeMonsterCard) {
        // Each monster card has its own condition tracker div inside it
        let conditionTrackerDiv = activeMonsterCard.querySelector('.conditions-trackers');

        // Check if this monster's condition map exists, if not, create one
        if (!conditionsMap.has(activeMonsterCard)) {
            conditionsMap.set(activeMonsterCard, new Set());
        }

        // Get the Set of conditions for this monster card
        const conditionsSet = conditionsMap.get(activeMonsterCard);

        // Handle Exhaustion separately (same as your previous logic)
        if (selectedCondition === 'Exhaustion') {
            let exhaustionNumber = 1;
            for (const condition of conditionsSet) {
                if (condition.startsWith('Exhaustion ')) {
                    const number = parseInt(condition.replace('Exhaustion ', ''));
                    if (!isNaN(number) && number >= exhaustionNumber) {
                        exhaustionNumber = number + 1;
                    }
                }
            }
            selectedCondition = `Exhaustion ${exhaustionNumber}`;

            // Clear all previous exhaustion conditions
            for (const condition of conditionsSet) {
                if (condition.startsWith('Exhaustion ')) {
                    conditionsSet.delete(condition);
                    removeConditionPill(condition, conditionTrackerDiv);
                }
            }
        } else if (conditionsSet.has(selectedCondition)) {
            // If the selected condition is already applied, do nothing
            return;
        }

        // Create a condition pill
        const conditionPill = document.createElement('div');
        conditionPill.classList.add('condition-pill');
        conditionPill.innerHTML = `
            <span>${selectedCondition}</span>
            <button class="remove-condition">x</button>
        `;

        // Add a click event listener to the remove button
        const removeButton = conditionPill.querySelector('.remove-condition');
        removeButton.addEventListener('click', () => {
            conditionsSet.delete(selectedCondition);
            removeConditionPill(selectedCondition, conditionTrackerDiv);
        });

        // Add the condition to the Set and the condition pill to the container
        conditionsSet.add(selectedCondition);
        conditionTrackerDiv.appendChild(conditionPill);
    }
}

// Function to remove a condition pill
function removeConditionPill(condition, conditionTrackerDiv) {
    const conditionPills = conditionTrackerDiv.querySelectorAll('.condition-pill');
    for (const pill of conditionPills) {
        if (pill.querySelector('span').textContent === condition) {
            conditionTrackerDiv.removeChild(pill);
            break;
        }
    }
}













// Saving and loading encounters


let allSavedEncounters = [];

function saveMonsterCardsAsEncounter(encounterName) {

    console.log("Trying to Save Encounter: ", encounterName)
    // Get all monster cards on the screen
    const monsterCards = document.querySelectorAll('.monster-card');
    const playerCards = document.querySelectorAll('.player-card');
    const encounterData = [];

    // Loop through each card to collect data
    monsterCards.forEach(card => {
        const isMonster = 1;
        const init = card.querySelector('.init-input').value;
        const name = card.querySelector('.monster-name').textContent;
        const currentHp = card.querySelector('.current-hp').textContent;
        const maxHp = card.querySelector('.max-hp').textContent;
        const tempHp = card.querySelector('.temp-hp').textContent;
        const conditions = []; // Changed from Map to array
        const isClosed = card.querySelector('.eye-button i').classList.contains('fa-eye-slash') ? 1 : 0;

        const conditionPills = card.querySelectorAll('.condition-pill');
        conditionPills.forEach(pill => {
            const conditionName = pill.querySelector('span').textContent; // Get the condition name
            conditions.push(conditionName); // Add the condition name to the array
        });

        // Push the gathered data for each monster into the encounterData array
        encounterData.push({
            isMonster,
            init,
            name,
            currentHp,
            maxHp,
            tempHp,
            conditions,
            isClosed // Save the state (0 for open, 1 for closed)
        });
    });
    playerCards.forEach(card => {
        const isMonster = 0;
        const name = card.querySelector('.monster-name')?.textContent || "default"; 
        const talespireId = card.getAttribute('data-player-id');
        const hpCurrent = 0; 
        const hpMax = 0; 
        const ac = 0; 
        const initiative = parseInt(card.querySelector('.init-input')?.value) || 0; 
        const passivePerception = 0; 
        const spellSave = 0; 
    
        // Push the gathered data for each player character into the encounterData array
        encounterData.push({
            isMonster,
            name,
            talespireId,
            hp: { current: hpCurrent, max: hpMax },
            ac,
            initiative,
            passivePerception,
            spellSave
        });
    });

    saveToCampaignStorage("Encounter Data", encounterName, encounterData, false)
}




async function showSavePopup() {
    await loadAndStoreMonsterData()
    // Get saved encounters from passed-in allSavedEncounters object
    const savedEncounters = allSavedEncounters;

    // Create the popup element
    const popup = document.createElement('div');
    popup.classList.add('save-popup');

    // Create title
    const title = document.createElement('h2');
    title.textContent = "Save Encounter";
    popup.appendChild(title);

    // Create input field for new encounter name
    const newEncounterInput = document.createElement('input');
    newEncounterInput.type = 'text';
    newEncounterInput.classList.add('encounter-save-input');
    newEncounterInput.placeholder = 'Enter new encounter name';
    popup.appendChild(newEncounterInput);

    // Create the dropdown or list for saved encounters
    const encounterList = document.createElement('ul');
    encounterList.style.display = 'none'; // Hide initially
    encounterList.classList.add('encounter-save-list')
    popup.appendChild(encounterList);

    // Populate the list with saved encounter names
    Object.keys(savedEncounters).forEach((encounterName) => {
        const encounterItem = document.createElement('li');
        encounterItem.textContent = encounterName;

        // Add click event to select the encounter and fill the input field
        encounterItem.addEventListener('click', () => {
            encounterList.style.display = 'none'; // Hide the list after selecting
            saveMonsterCardsAsEncounter(encounterName)
            closePopup();
            
        });
        encounterList.appendChild(encounterItem);
    });

    // Show the list when the input is clicked
    newEncounterInput.addEventListener('click', () => {
        encounterList.style.display = 'block'; // Show the list
    });
    newEncounterInput.addEventListener('blur', () => {
        setTimeout(() => {
            encounterList.style.display = 'none'; // Hide the list after a small delay
        }, 20); // Delay of 20 milliseconds (adjust as needed)
    });

    // Filter the list based on user input
    newEncounterInput.addEventListener('input', () => {
        const filterText = newEncounterInput.value.toLowerCase();

        // Loop through all the <li> items and hide those that don't match the input
        Array.from(encounterList.getElementsByTagName('li')).forEach((item) => {
            const text = item.textContent.toLowerCase();
            if (text.includes(filterText)) {
                item.style.display = ''; // Show the item
            } else {
                item.style.display = 'none'; // Hide the item
            }
        });
    });

    // Add a save button or logic to handle saving the encounter
    const saveButton = document.createElement('button');
    saveButton.classList.add('nonRollButton')
    saveButton.textContent = 'Save';
    popup.appendChild(saveButton);

    // Save the content based on the input value
    saveButton.addEventListener('click', () => {
        const encounterName = newEncounterInput.value.trim();
        if (encounterName) {
            saveMonsterCardsAsEncounter(encounterName); // Call your save function
            closePopup(); // Close the popup after saving
        }
        else {
            alert('Please enter a name for the new encounter.');
        }
    });

    // Append the list and button to the popup
    popup.appendChild(encounterList);

    // Append popup to the body
    document.body.appendChild(popup);
}




function closePopup() {
    const savepopup = document.querySelector('.save-popup');
    const loadpopup = document.querySelector('.load-popup');
    if (savepopup) {
        savepopup.remove();
    }
    if (loadpopup) {
        loadpopup.remove();
    }
}


// Load and update character data
async function loadAndStoreMonsterData() {
    const dataType = "Encounter Data"; // Adjust based on your data structure

    try {
        const allMonsterData = await loadDataFromCampaignStorage(dataType);

        if (allMonsterData) {
            allSavedEncounters = allMonsterData;
        } else {
            console.error("Encounter data not found.");
            // Handle the case where data is not found, e.g., show a message to the user
        }
    } catch (error) {
        console.error("Error loading encounter data:", error);
        // Handle the error appropriately, e.g., show an error message to the user
    }
}








//Loading the monsters cards into the page. 

async function loadEncountersAndPopulateCards() {
    await loadAndStoreMonsterData();

    // Retrieve the saved encounters from storage
    const savedEncounters = allSavedEncounters || {};

    // Create the popup element
    const popup = document.createElement('div');
    popup.classList.add('load-popup');

    // Create title
    const title = document.createElement('h2');
    title.textContent = "Load Encounter";
    popup.appendChild(title);

    // Create input field for filtering encounter names
    const filterInput = document.createElement('input');
    filterInput.type = 'text';
    filterInput.placeholder = 'Filter encounters...';
    filterInput.classList.add('encounter-save-input');
    popup.appendChild(filterInput);

    // Create the dropdown or list for saved encounters
    const encounterList = document.createElement('ul');
    encounterList.classList.add('encounter-save-list');
    popup.appendChild(encounterList);

    // Show the encounter list on filter input click
    filterInput.addEventListener('click', () => {
        encounterList.style.display = 'block'; // Show the list
        // Attach event listeners after the list is populated
        attachLoadEventListeners(encounterList, savedEncounters);
    });
    filterInput.addEventListener('blur', () => {
        setTimeout(() => {
            encounterList.style.display = 'none'; // Hide the list after a small delay
        }, 200); // Delay of 20 milliseconds (adjust as needed)
    });

    // Function to populate the encounter list
    function populateEncounterList(filter = '') {
        encounterList.innerHTML = ''; // Clear previous list

        // Loop through saved encounters and display their titles
        Object.keys(savedEncounters).forEach((encounterName) => {
            if (encounterName.toLowerCase().includes(filter.toLowerCase())) {
                const encounterItem = document.createElement('li');
                encounterItem.classList.add('encounter-item');

                const encounterText = document.createElement('span');
                encounterText.classList.add('encounter-load-text');
                encounterText.textContent = encounterName;
                encounterItem.appendChild(encounterText);

                // Add delete button next to each encounter
                const deleteButton = document.createElement('button');
                deleteButton.classList.add('delete-encounter', 'nonRollButton');
                deleteButton.textContent = 'Delete';
                encounterItem.appendChild(deleteButton);

                encounterList.appendChild(encounterItem);
            }
        });

        // Force reflow
        encounterList.getBoundingClientRect(); // Forces reflow to make sure DOM is updated
    }

    // Initially populate the list with all encounters
    populateEncounterList();

    // Add event listener to filter encounters based on input
    filterInput.addEventListener('input', () => {
        const filterText = filterInput.value;
        populateEncounterList(filterText);
    });

    

    // Append popup to the body
    document.body.appendChild(popup);
}



// Function to attach event listeners
function attachLoadEventListeners(encounterList, savedEncounters) {
    // Event delegation for clicking encounters or delete buttons
    encounterList.addEventListener('click', (event) => {
        const target = event.target;

        if (target.classList.contains('encounter-load-text')) {
            console.log("click");
            const encounterName = target.textContent;
            updateMonsterCardDataFromLoad(savedEncounters[encounterName]);
            closePopup();
        } else if (target.classList.contains('delete-encounter')) {
            event.stopPropagation(); // Prevent triggering the click event on the encounter
            const encounterName = target.closest('li').querySelector('.encounter-load-text').textContent;
            removeFromCampaignStorage("Encounter Data", encounterName);
            closePopup();
        }
    });
}


function updateMonsterCardDataFromLoad(encounterData) {
    const monsterCardsContainer = document.getElementById('initiative-tracker');
    monsterCardsContainer.innerHTML = ''; // Clear previous monster cards

    // Loop through the monsters in the encounter data and create a new card for each
    encounterData.forEach(monster => {

        console.log(monster)

        if (monster.isMonster === 0){
            mergeOtherPlayers(playersInCampaign) ;
            const card = createEmptyPlayerCard();
            updatePlayerCard(card, monster)
            closePopup();
        }
        else{
            // Create an empty monster card
            const newMonsterCard = createEmptyMonsterCard();

            // Populate the monster card with the correct data
            updateMonsterCard(newMonsterCard, monster);

            // Append the new monster card to the container
            monsterCardsContainer.appendChild(newMonsterCard);
        }
        
    });
    debouncedRequestPlayerInfo();
}




// Handle the rolled initiative for active monster
function handleInitiativeResult(resultGroup) {
    // Extract the results from the initiative result group
    const operands = resultGroup.result.operands;
    console.log(resultGroup);

    let totalInitiative = 0;

    // Loop through each operand to compute the total initiative value
    for (const operand of operands) {
        if (operand.kind === "d20" && operand.results) {
            // Sum up the d20 results
            totalInitiative += operand.results.reduce((sum, roll) => sum + roll, 0);
        } else if (operand.value) {
            // Adjust total based on the operator
            totalInitiative += (resultGroup.result.operator === "+") ? operand.value : -operand.value;
        }
    }

    if (activeMonsterCard) {
        const initInput = activeMonsterCard.querySelector('.init-input');

        if (initInput) {
            console.log(resultGroup);
            initInput.value = totalInitiative; 
            reorderCards();
        } else {
            console.error('Initiative input not found in the active monster card.');
        }
    } else {
        console.warn('No active monster card to update initiative for.');
    }
}


let playersInCampaign;

async function getPlayersInCampaign() {
    // Get the array of player fragments from the campaign
    let tester = await TS.players.getPlayersInThisCampaign();
    console.log("Player Fragments:", tester);  // Log the player fragments array for reference

    // Create an array of promises to process each player
    const playerPromises = tester.map(async (playerFragment) => {
        try {
            // Check if this player is 'me' using the isMe function
            const isPlayerMe = await TS.players.isMe(playerFragment);

            if (isPlayerMe) {
                console.log("Skipping player (it's you):", playerFragment);  // Log that it's you
                return null;  // Skip this player by returning null
            }

            // Call getMoreInfo to get additional information about the player
            const playerInfo = await TS.players.getMoreInfo([playerFragment]);
            console.log("Player Info:", playerInfo);  // Log the player info to console
            return playerInfo;  // Return the player info

        } catch (error) {
            console.error("Error fetching info for player:", playerFragment, error);
            return null;  // In case of error, return null
        }
    });

    // Wait for all the promises to resolve and handle them in parallel
    const playerInfos = await Promise.all(playerPromises);

    // Filter out null values (the ones that were skipped or had errors)
    const validPlayerInfos = playerInfos.filter(info => info !== null);
    playersInCampaign = validPlayerInfos
}


// Subscribe to the event for player joining
function handlePlayerPermissionEvents() {
        getPlayersInCampaign();
};




// Requestion and recieving information from other connected clients. 

async function requestPlayerInfo() {

    const message = {
        type: 'request-info',
        data: {
            request: [] // Requesting specific info
        }
    };

    // Send the message to all players on the board
     try {
        console.log("sending message request")
        await TS.sync.send(JSON.stringify(message), "board");
    } catch (error) {
        console.error(`Error sending initiative list to client :`, error);
    }
}


async function sendInitiativeListToPlayer() {
    const tracker = document.getElementById("initiative-tracker");

    // Ensure tracker exists
    if (!tracker) {
        console.error("Initiative tracker element not found.");
        return;
    }

    // Retrieve all cards
    const cards = Array.from(tracker.querySelectorAll(".monster-card, .player-card"));

    // Check if cards array is empty
    if (cards.length === 0) {
        console.warn("No cards to send.");
        return;
    }

    // Prepare the initiative list with compact data
    const initiativeList = cards.map(card => {
        const nameElement = card.querySelector(".monster-name");
        const isPlayer = card.classList.contains("player-card") ? 1 : 0;
        const eyeButton = card.querySelector(".eye-button"); // Assuming the eye button has the class '.eye-button'
        const isVisible = eyeButton && eyeButton.querySelector('i') && eyeButton.querySelector('i').classList.contains('fa-eye-slash') ? 0 : 1;

        return {
            n: isPlayer ? nameElement.textContent.trim() : "", // Name only for players
            p: isPlayer, // 1 for player, 0 for enemy
            v: isVisible // 1 for visible, 0 for hidden
        };
    });

    // Send the initiative list to each client
    const message = {
        type: 'player-init-list',
        data: initiativeList
    };

    try {
        await TS.sync.send(JSON.stringify(message), "board");
    } catch (error) {
        console.error(`Error sending initiative list to client :`, error);
    }
    
    highlightCurrentTurn()
    sendInitiativeRound()
}

async function sendInitiativeTurn(initiativeIndex) {
    // Send the initiative list to each client
    const message = {
        type: 'player-init-turn',
        data: initiativeIndex
    };

    try {
        await TS.sync.send(JSON.stringify(message), "board");
    } catch (error) {
        console.error(`Error sending initiative list to client :`, error);
    }
}

async function sendInitiativeRound() {
    const message = {
        type: 'player-init-round',
        data: roundCounter
    };

    try {
        await TS.sync.send(JSON.stringify(message), "board");
    } catch (error) {
        console.error(`Error sending initiative list to client :`, error);
    }
}





async function handleSyncEvents(event) {

    let fromClient = event.payload.fromClient.id;
    TS.clients.isMe(fromClient).then((isMe) => {
        if (!isMe) {
            console.log("Getting message");
            const parsedMessage = JSON.parse(event.payload.str);

            // Route the message based on its type using the messageHandlers library
            if (parsedMessage.type && messageHandlers[parsedMessage.type]) {
                messageHandlers[parsedMessage.type](parsedMessage, fromClient);
            } else {
                console.warn("Unhandled message type:", parsedMessage.type);
            }
        }
    });
}






function handlePlayerResponse(parsedMessage, fromClient) {
    const { requestId, data } = parsedMessage;

    // Process the response data (update UI, log, etc.)
    console.log(`Received response for requestId: ${requestId} from player ${fromClient}`, data);

}

function handleRequestedStats(parsedMessage, fromClient) {
    console.log("Handling player stats update from:", fromClient);

    // Extract player data from the parsedMessage
    console.log(parsedMessage)
    const playerData = parsedMessage.data; // Assuming data contains stats like HP, AC, etc.
    const playerId = parsedMessage.playerId.id; // Assume fromClient is the unique player ID (client.id)
 
    // Get all the player cards from the DOM
    const playerCards = document.querySelectorAll('.player-card');

    // Loop through all the player cards and update the matching one
    playerCards.forEach(card => {
        // Assuming you've stored the player's ID in the card's dataset
        const cardPlayerId = card.dataset.playerId;

        // If the card's player ID matches the fromClient ID, update the card
        if (cardPlayerId === playerId) {
            updatePlayerCard(card, playerData); // Reuse your existing updatePlayerCard function
        }
    });
}

function handleUpdatePlayerHealth(parsedMessage, fromClient) {
    console.log("Handling player health update from:", fromClient);

    const { change, hpType } = parsedMessage.data;

    // Update the player's health here based on the received data
    // Example: If hpType is 'current', adjust the current health accordingly
}

function handleApplyMonsterDamage(parsedMessage, fromClient) {
    console.log("Applying monster damage to player from:", fromClient);

    const { damage } = parsedMessage.data;

    // Apply damage to the player's character sheet, or whatever logic you need
}

function handleUpdatePlayerInitiative(parsedMessage, fromClient){

    console.log(parsedMessage)
    const playerInit = parseInt(parsedMessage.data.Initiative); 
    const playerId = fromClient; // Assume fromClient is the unique player ID (client.id)

    // Get all the player cards from the DOM
    const playerCards = document.querySelectorAll('.player-card');

    console.log(playerInit)

    // Loop through all the player cards and update the matching one
    playerCards.forEach(card => {
        // Assuming you've stored the player's ID in the card's dataset
        const cardPlayerId = card.dataset.playerId; 

        // If the card's player ID matches the fromClient ID, update the card
        if (cardPlayerId === playerId) {
            const initInput = card.querySelector('.init-input')
            console.log(playerInit)
            initInput.value = playerInit
        }
    });
}


function handleRequestInitList(){
    debouncedSendInitiativeListToPlayer()
}




const customMonsterButton = document.getElementById('customMonsters');
const monsterForm = document.getElementById("monsterCreationForm");
const monsterFormModal = document.getElementById("monsterFormModal");
const closeMonsterFormButton = document.getElementById('closeMonsterForm');
let items = []; // Store created spells

// Open the form
customMonsterButton.addEventListener('click', () => {
    monsterFormModal.style.display = 'block';
    populateCheckboxes("monsterFormVulnerabilities", damageTypes, "vulnerability");
    populateCheckboxes("monsterFormResistances", damageTypes, "resistance");
    populateCheckboxes("monsterFormImmunities", damageTypes, "immunity");
    populateCheckboxes("monsterFormConditionImmunities", conditionTypes, "conditionImmunity");
});

// Close the form
closeMonsterFormButton.addEventListener('click', () => {
    monsterFormModal.style.display = 'none';
});

document.getElementById("monsterCreationForm").addEventListener("submit", function (event) {
    event.preventDefault();

    // Gather form data
    const monsterData = {
        Id: document.getElementById("monsterFormName").value,
        Name: document.getElementById("monsterFormName").value,
        Path: "",
        Source: document.getElementById("monsterFormSource").value,
        Type: document.getElementById("monsterFormType").value,
        InitiativeModifier: document.getElementById("monsterFormInitiativeModifier").value,
        HP: {
            Value: parseInt(document.getElementById("monsterFormHPValue").value),
            Notes: document.getElementById("monsterFormHPNotes").value
        },
        AC: {
            Value: parseInt(document.getElementById("monsterFormACValue").value),
            Notes: document.getElementById("monsterFormACNotes").value
        },
        Speed: document.getElementById("monsterFormSpeed").value.split(",") ,
        Senses: document.getElementById("monsterFormSenses").value.split(",") ,
        Languages: document.getElementById("monsterFormLanguages").value.split(",") ,
        Abilities: {
            Str: parseInt(document.getElementById("monsterFormStr").value),
            Dex: parseInt(document.getElementById("monsterFormDex").value),
            Con: parseInt(document.getElementById("monsterFormCon").value),
            Int: parseInt(document.getElementById("monsterFormInt").value),
            Wis: parseInt(document.getElementById("monsterFormWis").value),
            Cha: parseInt(document.getElementById("monsterFormCha").value)
        },
        Saves: saveSaves(),
        Skills: saveSkills(),
        DamageVulnerabilities: getCheckedValues("monsterFormVulnerabilities"),
        DamageResistances: getCheckedValues("monsterFormResistances"),
        DamageImmunities: getCheckedValues("monsterFormImmunities"),
        ConditionImmunities: getCheckedValues("monsterFormConditionImmunities"),
        Traits: collectDynamicFields("monsterFormTraits"),
        Actions: collectDynamicFields("monsterFormActions"),
        Reactions: collectDynamicFields("monsterFormReactions"),
        LegendaryActions: collectDynamicFields("monsterFormLegendaryActions")
    };

    console.log(monsterData); // Save or use this data in your application
    saveMonsterData(monsterData)

    
});

async function saveMonsterData(monsterData){
    try {
        // Save and wait for completion
        await saveToGlobalStorage("Custom Monsters", monsterData.Name, monsterData, true);
        console.log("Save completed.");
        await loadMonsterDataFiles(); // Ensure this runs after save completes
    } catch (error) {
        console.error("Error during save or load:", error);
    }

    monsterFormModal.style.display = 'none'; // Close the form
    monsterForm.reset(); // Reset the form
}

function collectDynamicFields(sectionId) {
    const section = document.getElementById(sectionId);
    const items = [...section.querySelectorAll(".dynamic-entry")];
    return items.map(item => ({
        Name: item.querySelector(".entry-name").value,
        Content: item.querySelector(".entry-content").value,
    }));
}

// Add dynamic fields
function addDynamicField(sectionId) {
    const section = document.getElementById(sectionId);
    const div = document.createElement("div");
    div.classList.add("dynamic-entry");

    console.log(section)

    div.innerHTML = `
        <div>
            <input type="text" class="entry-name" placeholder="Name">
            <button type="button" class="removeEntry nonRollButton">Remove</button>
        </div>
        <textarea class="entry-content" placeholder="Content"></textarea>  
    `;

    section.appendChild(div);

    div.querySelector(".removeEntry").addEventListener("click", () => {
        div.remove();
    });
}

// Buttons to add dynamic entries
document.getElementById("addTraitButton").addEventListener("click", () => addDynamicField("monsterFormTraits"));
document.getElementById("addActionButton").addEventListener("click", () => addDynamicField("monsterFormActions"));
document.getElementById("addReactionButton").addEventListener("click", () => addDynamicField("monsterFormReactions"));
document.getElementById("addLegendaryActionsButton").addEventListener("click", () => addDynamicField("monsterFormLegendaryActions"));

function populateCheckboxes(containerId, types, namePrefix) {
    const container = document.getElementById(containerId);
    container.innerHTML = ""; // Clear container before populating (if re-used)

    console.log(containerId);
    console.log(container)

    types.forEach(type => {
        const label = document.createElement("label");
        const checkbox = document.createElement("input");
        const span = document.createElement("span");

        // Configure the checkbox
        checkbox.type = "checkbox";
        checkbox.id = `${namePrefix}${type}`;
        checkbox.name = namePrefix;
        checkbox.value = type;

        // Configure the span label
        span.id = `label${type}`;
        span.textContent = type;

        // Append the checkbox and span to the label
        label.appendChild(checkbox);
        label.appendChild(span);

        // Add the label to the container
        container.appendChild(label);
    });
}


function getCheckedValues(containerId) {
    const container = document.getElementById(containerId);
    const checkboxes = container.querySelectorAll("input[type='checkbox']");
    const checkedValues = Array.from(checkboxes)
        .filter(checkbox => checkbox.checked)
        .map(checkbox => checkbox.value);
    return checkedValues;
}

function saveSaves() {
    const saves = [];
    const saveIds = ["Str", "Dex", "Con", "Int", "Wis", "Cha"];

    saveIds.forEach(saveId => {
        const saveValue = parseInt(document.getElementById(`monsterForm${saveId}Save`).value);
        if (!isNaN(saveValue) && saveValue !== 0) {
            saves.push({
                Name: saveId,
                Modifier: saveValue
            });
        }
    });

    return saves;
}


function saveSkills() {
    const skills = [];
    const skillInputs = [
        { id: "monsterAcrobatics", name: "Acrobatics" },
        { id: "monsterAnimalHandling", name: "Animal Handling" },
        { id: "monsterArcana", name: "Arcana" },
        { id: "monsterAthletics", name: "Athletics" },
        { id: "monsterDeception", name: "Deception" },
        { id: "monsterHistory", name: "History" },
        { id: "monsterInsight", name: "Insight" },
        { id: "monsterIntimidation", name: "Intimidation" },
        { id: "monsterInvestigation", name: "Investigation" },
        { id: "monsterMedicine", name: "Medicine" },
        { id: "monsterNature", name: "Nature" },
        { id: "monsterPerception", name: "Perception" },
        { id: "monsterPerformance", name: "Performance" },
        { id: "monsterPersuasion", name: "Persuasion" },
        { id: "monsterReligion", name: "Religion" },
        { id: "monsterSleightOfHand", name: "Sleight of Hand" },
        { id: "monsterStealth", name: "Stealth" },
        { id: "monsterSurvival", name: "Survival" }
    ];

    skillInputs.forEach(skill => {
        const skillValue = parseInt(document.getElementById(skill.id).value);
        if (!isNaN(skillValue) && skillValue !== 0) {
            skills.push({
                Name: skill.name,
                Modifier: skillValue
            });
        }
    });

    return skills;
}