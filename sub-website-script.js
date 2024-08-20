let upperParkingSpaces = JSON.parse(localStorage.getItem('upperParkingSpaces')) || [];
let lowerParkingSpaces = JSON.parse(localStorage.getItem('lowerParkingSpaces')) || [];
let currentTrailers = {};
let currentRecommendedSpaceIndex = -1;
let availableSpaces = [];

upperParkingSpaces.forEach(space => { if (space.trailer) currentTrailers[space.trailer.toLowerCase()] = space.number; });
lowerParkingSpaces.forEach(space => { if (space.trailer) currentTrailers[space.trailer.toLowerCase()] = space.number; });

document.addEventListener('DOMContentLoaded', () => {
    const spaceSelect = document.getElementById('addTrailerSpace');
    addOptionsToSelect(upperParkingSpaces, spaceSelect, 'Upper Trailer Park');
    addOptionsToSelect(lowerParkingSpaces, spaceSelect, 'Lower Trailer Park');

    document.getElementById('searchButton').addEventListener('click', searchTrailer);
    document.getElementById('addTrailerForm').addEventListener('submit', addTrailer);
    document.getElementById('removeTrailerForm').addEventListener('submit', removeTrailer);
    document.getElementById('recommendSpaceButton').addEventListener('click', toggleRecommendedSpace);
    document.getElementById('getRecommendedSpace').addEventListener('click', showRecommendedSpace);
    document.getElementById('skipSpaceButton').addEventListener('click', skipToNextSpace);
    document.getElementById('allocateTrailerForm').addEventListener('submit', allocateTrailerToRecommendedSpace);
});

function addOptionsToSelect(spaces, selectElement, groupLabel) {
    const group = document.createElement('optgroup');
    group.label = groupLabel;
    spaces.forEach(space => { if (!space.trailer) group.appendChild(new Option(space.number, space.number)); });
    selectElement.appendChild(group);
}

function toggleRecommendedSpace() {
    const recommendedSpaceDisplay = document.getElementById('recommendedSpaceDisplay');
    recommendedSpaceDisplay.style.display = recommendedSpaceDisplay.style.display === 'none' || recommendedSpaceDisplay.style.display === '' ? 'block' : 'none';
}

function searchTrailer() {
    const trailerNumber = document.getElementById('searchInput').value.trim().toLowerCase();
    const message = currentTrailers[trailerNumber] ? `Trailer ${trailerNumber.toUpperCase()} is in space ${currentTrailers[trailerNumber]}.` : `Trailer ${trailerNumber.toUpperCase()} not found.`;
    document.getElementById('message').textContent = message;
}

function addTrailer(event) {
    event.preventDefault();
    const trailerNumber = document.getElementById('addTrailerNumber').value.trim().toLowerCase();
    const trailerSpace = document.getElementById('addTrailerSpace').value;
    const trailerStatus = document.getElementById('addTrailerStatus').value;

    allocateTrailer(trailerNumber, trailerSpace, trailerStatus);
}

function removeTrailer(event) {
    event.preventDefault();
    const trailerNumber = document.getElementById('removeTrailerNumber').value.trim().toLowerCase();
    if (currentTrailers[trailerNumber]) {
        const spaceToUpdate = findSpaceByNumber(currentTrailers[trailerNumber]);
        if (spaceToUpdate) {
            delete currentTrailers[trailerNumber];
            spaceToUpdate.trailer = '';
            spaceToUpdate.status = 'green';
            saveAndSyncSpaces();
            document.getElementById('message').textContent = `Trailer ${trailerNumber.toUpperCase()} has been removed from space ${spaceToUpdate.number}.`;
        }
    } else {
        document.getElementById('message').textContent = `Trailer ${trailerNumber.toUpperCase()} not found.`;
    }
}

function showRecommendedSpace() {
    const trailerType = document.getElementById('trailerType').value;
    availableSpaces = trailerType === 'menzies' ? [...upperParkingSpaces, ...lowerParkingSpaces] : [...lowerParkingSpaces, ...upperParkingSpaces];
    availableSpaces = availableSpaces.filter(space => !space.trailer);
    currentRecommendedSpaceIndex = 0;
    showNextAvailableSpace();
}

function showNextAvailableSpace() {
    if (currentRecommendedSpaceIndex < availableSpaces.length) {
        const recommendedSpace = availableSpaces[currentRecommendedSpaceIndex];
        const parkType = upperParkingSpaces.includes(recommendedSpace) ? 'Upper' : 'Lower';
        document.getElementById('recommendedSpaceText').textContent = `Recommended space is ${recommendedSpace.number} in the ${parkType} Trailer Park.`;
        document.getElementById('skipSpaceButton').style.display = 'inline-block';
        document.getElementById('allocateTrailerForm').style.display = 'block';
        document.getElementById('allocateTrailerForm').dataset.recommendedSpace = recommendedSpace.number;
    } else {
        document.getElementById('recommendedSpaceText').textContent = 'No available spaces.';
        document.getElementById('skipSpaceButton').style.display = 'none';
        document.getElementById('allocateTrailerForm').style.display = 'none';
    }
}

function skipToNextSpace() {
    const skippedSpace = availableSpaces[currentRecommendedSpaceIndex];
    const confirmation = confirm(`Do you want to skip space ${skippedSpace.number}? It will be marked as occupied.`);
    
    if (confirmation) {
        skippedSpace.trailer = ''; // Keep the trailer empty
        skippedSpace.status = 'occupied'; // Mark the skipped space as occupied (pink)
        saveAndSyncSpaces();
        currentRecommendedSpaceIndex++;
        showNextAvailableSpace();
    }
}

function allocateTrailerToRecommendedSpace(event) {
    event.preventDefault();
    const trailerNumber = document.getElementById('trailerNumber').value.trim().toLowerCase();
    const trailerStatus = document.getElementById('trailerStatus').value;
    const recommendedSpace = document.getElementById('allocateTrailerForm').dataset.recommendedSpace;

    allocateTrailer(trailerNumber, recommendedSpace, trailerStatus);
}

function allocateTrailer(trailerNumber, spaceNumber, trailerStatus) {
    const spaceToUpdate = findSpaceByNumber(spaceNumber);
    if (spaceToUpdate) {
        if (spaceToUpdate.trailer && !confirm(`Space ${spaceNumber} is occupied by trailer ${spaceToUpdate.trailer.toUpperCase()}. Replace it with trailer ${trailerNumber.toUpperCase()}?`)) {
            document.getElementById('message').textContent = `Trailer ${trailerNumber.toUpperCase()} was not allocated to space ${spaceNumber}.`;
            return;
        }

        spaceToUpdate.trailer = trailerNumber;
        spaceToUpdate.status = trailerStatus;
        currentTrailers[trailerNumber] = spaceNumber;
        saveAndSyncSpaces();
        document.getElementById('message').textContent = `Trailer ${trailerNumber.toUpperCase()} has been allocated to space ${spaceNumber}.`;
    }
}

function findSpaceByNumber(spaceNumber) {
    return [...upperParkingSpaces, ...lowerParkingSpaces].find(space => space.number === spaceNumber);
}

function saveAndSyncSpaces() {
    localStorage.setItem('upperParkingSpaces', JSON.stringify(upperParkingSpaces));
    localStorage.setItem('lowerParkingSpaces', JSON.stringify(lowerParkingSpaces));
    window.dispatchEvent(new Event('storage'));
}

window.addEventListener('storage', () => {
    upperParkingSpaces = JSON.parse(localStorage.getItem('upperParkingSpaces')) || upperParkingSpaces;
    lowerParkingSpaces = JSON.parse(localStorage.getItem('lowerParkingSpaces')) || lowerParkingSpaces;
    updateCurrentTrailers();
});

function updateCurrentTrailers() {
    currentTrailers = {};
    upperParkingSpaces.forEach(space => { if (space.trailer) currentTrailers[space.trailer.toLowerCase()] = space.number; });
    lowerParkingSpaces.forEach(space => { if (space.trailer) currentTrailers[space.trailer.toLowerCase()] = space.number; });
}
