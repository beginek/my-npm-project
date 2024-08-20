// Firebase and Firestore initialization
const firebaseConfig = {
    apiKey: "AIzaSyCvXhoMEzJdj1zC1z0Z0-KZg-LM79cFUTE",
    authDomain: "sesetrailerapp.firebaseapp.com",
    databaseURL: "https://sesetrailerapp-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "sesetrailerapp",
    storageBucket: "sesetrailerapp.appspot.com",
    messagingSenderId: "209729409296",
    appId: "1:209729409296:web:85925c1a9ccda11a22d595",
    measurementId: "G-MMRJ3283FW"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const defaultUpperParkingSpaces = [
    ...Array.from({ length: 28 }, (_, i) => ({ number: `L${i + 1}`, trailer: '', status: 'green' })),
    ...Array.from({ length: 26 }, (_, i) => ({ number: `R${i + 3}`, trailer: '', status: 'green' }))
];

const defaultLowerParkingSpaces = [
    ...Array.from({ length: 30 }, (_, i) => ({ number: `L${i + 1}`, trailer: '', status: 'green' })),
    ...Array.from({ length: 33 }, (_, i) => ({ number: `R${i + 1}`, trailer: '', status: 'green' }))
];

let upperParkingSpaces = [];
let lowerParkingSpaces = [];

async function loadParkingSpaces() {
    try {
        const upperDocRef = db.collection('parkingSpaces').doc('upper');
        const upperDoc = await upperDocRef.get();
        if (!upperDoc.exists) {
            await upperDocRef.set({ spaces: defaultUpperParkingSpaces });
            upperParkingSpaces = defaultUpperParkingSpaces;
        } else {
            upperParkingSpaces = upperDoc.data().spaces;
        }

        const lowerDocRef = db.collection('parkingSpaces').doc('lower');
        const lowerDoc = await lowerDocRef.get();
        if (!lowerDoc.exists) {
            await lowerDocRef.set({ spaces: defaultLowerParkingSpaces });
            lowerParkingSpaces = defaultLowerParkingSpaces;
        } else {
            lowerParkingSpaces = lowerDoc.data().spaces;
        }

        renderParkingSpaces('upper-parking-lot', upperParkingSpaces.filter(space => space.number.startsWith('L')), upperParkingSpaces.filter(space => space.number.startsWith('R')));
        renderParkingSpaces('lower-parking-lot', lowerParkingSpaces.filter(space => space.number.startsWith('L')), lowerParkingSpaces.filter(space => space.number.startsWith('R')));
        updateLegendCounts();
    } catch (error) {
        console.error("Error loading parking spaces: ", error);
    }
}

loadParkingSpaces();

const trailerStatusColors = {
    empty: 'empty',
    waste: 'yellow',
    loaded: 'loaded',
    unknown: 'unknown',
    defected: 'purple',
    green: 'green',
    occupied: 'pink'
};

function updateLegendCounts() {
    const counts = {
        green: 0,
        empty: 0,
        yellow: 0,
        loaded: 0,
        purple: 0,
        unknown: 0,
        pink: 0,
    };

    [...upperParkingSpaces, ...lowerParkingSpaces].forEach(space => {
        counts[space.status]++;
    });

    document.getElementById('count-empty').textContent = counts.green;
    document.getElementById('count-empty-trailer').textContent = counts.empty;
    document.getElementById('count-waste').textContent = counts.yellow;
    document.getElementById('count-loaded').textContent = counts.loaded;
    document.getElementById('count-defective').textContent = counts.purple;
    document.getElementById('count-unknown').textContent = counts.unknown;
    document.getElementById('count-occupied').textContent = counts.pink;
}

function askTrailerStatus(trailerNumber, parkingLotId, spaceNumber) {
    const status = prompt(`Enter the status for Trailer ${trailerNumber}:\n1. Empty\n2. Waste\n3. Loaded\n4. Unknown\n5. Defective\n6. Occupied`, "Enter the number corresponding to the status");

    if (status) {
        let selectedStatus;
        switch (status) {
            case "1":
                selectedStatus = 'empty';
                break;
            case "2":
                selectedStatus = 'waste';
                break;
            case "3":
                selectedStatus = 'loaded';
                break;
            case "4":
                selectedStatus = 'unknown';
                break;
            case "5":
                selectedStatus = 'defected';
                break;
            case "6":
                selectedStatus = 'occupied';
                break;
            default:
                alert("Invalid selection. Please try again.");
                return askTrailerStatus(trailerNumber, parkingLotId, spaceNumber);
        }

        if (selectedStatus === 'defected') {
            const defectReason = prompt("Please enter the reason for defecting this trailer:");
            if (!defectReason) {
                alert('Defect reason is required.');
                return;
            }
            updateTrailerStatus(trailerNumber, selectedStatus, true, defectReason, parkingLotId, spaceNumber);
        } else {
            updateTrailerStatus(trailerNumber, selectedStatus, false, "", parkingLotId, spaceNumber);
        }
    }
}

async function updateTrailerStatus(trailerNumber, status, isDefected, defectReason, parkingLotId, spaceNumber) {
    let spaceToUpdate;
    let spacesRef;

    if (parkingLotId === 'upper-parking-lot') {
        spaceToUpdate = upperParkingSpaces.find(space => space.number === spaceNumber);
        spacesRef = db.collection('parkingSpaces').doc('upper');
    } else if (parkingLotId === 'lower-parking-lot') {
        spaceToUpdate = lowerParkingSpaces.find(space => space.number === spaceNumber);
        spacesRef = db.collection('parkingSpaces').doc('lower');
    }

    if (spaceToUpdate) {
        spaceToUpdate.trailer = trailerNumber;
        spaceToUpdate.status = isDefected ? 'defected' : status;

        try {
            await spacesRef.set({ spaces: parkingLotId === 'upper-parking-lot' ? upperParkingSpaces : lowerParkingSpaces });
            renderParkingSpaces(parkingLotId, parkingLotId === 'upper-parking-lot' ? upperLeftSpaces : lowerLeftSpaces, parkingLotId === 'upper-parking-lot' ? upperRightSpaces : lowerRightSpaces);
            if (isDefected) {
                await addDefectiveTrailer(spaceToUpdate.number, defectReason);
            }
            updateLegendCounts();
        } catch (error) {
            console.error("Error updating trailer status: ", error);
        }
    } else {
        alert('Location not found');
    }
}

async function addDefectiveTrailer(trailerNumber, reason) {
    const defectListRef = db.collection('defects').doc('list');
    try {
        const defectList = (await defectListRef.get()).data()?.trailers || [];
        defectList.unshift({ trailerNumber, reason });
        if (defectList.length > 10) {
            defectList.pop();
        }
        await defectListRef.set({ trailers: defectList });
        renderDefectiveTrailers();
    } catch (error) {
        console.error("Error adding defective trailer: ", error);
    }
}

async function renderDefectiveTrailers() {
    const defectListRef = db.collection('defects').doc('list');
    try {
        const defectList = (await defectListRef.get()).data()?.trailers || [];
        const defectListElement = document.getElementById('lastDefectedTrailers');
        defectListElement.innerHTML = '';

        defectList.forEach(item => {
            const listItem = document.createElement('li');
            listItem.textContent = `Trailer ${item.trailerNumber}: ${item.reason}`;
            defectListElement.appendChild(listItem);
        });
    } catch (error) {
        console.error("Error rendering defective trailers: ", error);
    }
}

function renderParkingSpaces(parkingLotId, leftSpaces, rightSpaces) {
    const parkingLot = document.getElementById(parkingLotId);
    parkingLot.innerHTML = '';

    const leftColumn = document.createElement('div');
    leftColumn.className = 'parking-side';

    leftSpaces.forEach(space => {
        const containerDiv = document.createElement('div');
        containerDiv.className = 'parking-space-container';

        const numberSpan = document.createElement('span');
        numberSpan.className = 'parking-space-number';
        numberSpan.textContent = space.number;

        const spaceDiv = document.createElement('div');
        const spaceClass = trailerStatusColors[space.status] || 'green';
        spaceDiv.className = `parking-space ${spaceClass} visible`;

        spaceDiv.innerHTML = `<input type="text" class="trailer-input" value="${space.trailer}" data-number="${space.number}" data-parking-lot-id="${parkingLotId}">`;

        containerDiv.appendChild(numberSpan);
        containerDiv.appendChild(spaceDiv);
        leftColumn.appendChild(containerDiv);
    });

    const rightColumn = document.createElement('div');
    rightColumn.className = 'parking-side';

    rightSpaces.forEach(space => {
        const containerDiv = document.createElement('div');
        containerDiv.className = 'parking-space-container';

        const spaceDiv = document.createElement('div');
        const spaceClass = trailerStatusColors[space.status] || 'green';
        spaceDiv.className = `parking-space ${spaceClass} visible`;

        spaceDiv.innerHTML = `<input type="text" class="trailer-input" value="${space.trailer}" data-number="${space.number}" data-parking-lot-id="${parkingLotId}">`;

        const numberSpan = document.createElement('span');
        numberSpan.className = 'parking-space-number';
        numberSpan.textContent = space.number;

        containerDiv.appendChild(spaceDiv);
        containerDiv.appendChild(numberSpan);
        rightColumn.appendChild(containerDiv);
    });

    parkingLot.appendChild(leftColumn);
    parkingLot.appendChild(rightColumn);

    document.querySelectorAll('.trailer-input').forEach(input => {
        input.addEventListener('blur', function() {
            const number = this.dataset.number;
            const trailer = this.value.trim();
            const parkingLotId = this.dataset.parkingLotId;
            if (trailer) {
                trimTrailingSpaces();
                askTrailerStatus(trailer, parkingLotId, number);
            } else {
                updateParkingSpace(parkingLotId, number, '');
            }
        });
    });
}

function trimTrailingSpaces() {
    document.querySelectorAll('.trailer-input').forEach(input => {
        input.value = input.value.trim();
    });
}

async function updateParkingSpace(parkingLotId, location, trailerNumber) {
    let spaceToUpdate;
    let spacesRef;

    if (parkingLotId === 'upper-parking-lot') {
        spaceToUpdate = upperParkingSpaces.find(space => space.number === location);
        spacesRef = db.collection('parkingSpaces').doc('upper');
    } else if (parkingLotId === 'lower-parking-lot') {
        spaceToUpdate = lowerParkingSpaces.find(space => space.number === location);
        spacesRef = db.collection('parkingSpaces').doc('lower');
    }

    if (spaceToUpdate) {
        spaceToUpdate.trailer = trailerNumber || '';
        spaceToUpdate.status = trailerNumber ? 'unknown' : 'green';

        try {
            await spacesRef.set({ spaces: parkingLotId === 'upper-parking-lot' ? upperParkingSpaces : lowerParkingSpaces });
            renderParkingSpaces(parkingLotId, parkingLotId === 'upper-parking-lot' ? upperLeftSpaces : lowerLeftSpaces, parkingLotId === 'upper-parking-lot' ? upperRightSpaces : lowerRightSpaces);
            updateLegendCounts();
        } catch (error) {
            console.error("Error updating parking space: ", error);
        }
    } else {
        alert('Location not found');
    }
}

document.getElementById('exportDefects').addEventListener('click', async function() {
    const defectListRef = db.collection('defects').doc('list');
    try {
        const defectList = (await defectListRef.get()).data()?.trailers || [];
        exportData(defectList, 'defective-trailers.csv');
    } catch (error) {
        console.error("Error exporting defective trailers: ", error);
    }
});

document.getElementById('exportTrailers').addEventListener('click', async function() {
    const allSpaces = [...upperParkingSpaces, ...lowerParkingSpaces];
    exportData(allSpaces, 'trailers-data.csv');
});

function exportData(data, filename) {
    const csvContent = "data:text/csv;charset=utf-8,"
        + data.map(e => e instanceof Object ? Object.values(e).join(",") : e).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link); 
    link.click();
    document.body.removeChild(link);
}

const upperLeftSpaces = upperParkingSpaces.filter(space => space.number.startsWith('L'));
const upperRightSpaces = upperParkingSpaces.filter(space => space.number.startsWith('R'));

const lowerLeftSpaces = lowerParkingSpaces.filter(space => space.number.startsWith('L'));
const lowerRightSpaces = lowerParkingSpaces.filter(space => space.number.startsWith('R'));

renderParkingSpaces('upper-parking-lot', upperLeftSpaces, upperRightSpaces);
renderParkingSpaces('lower-parking-lot', lowerLeftSpaces, lowerRightSpaces);

renderDefectiveTrailers();
updateLegendCounts();

document.getElementById('searchButton').addEventListener('click', function() {
    const searchInput = document.getElementById('searchInput').value.trim().toLowerCase();
    highlightTrailerSpace(searchInput);
});

function highlightTrailerSpace(trailerNumber) {
    const allSpaces = [...upperParkingSpaces, ...lowerParkingSpaces];
    const searchResultContainer = document.getElementById('searchResultContainer');
    searchResultContainer.innerHTML = '';

    document.querySelectorAll('.parking-space').forEach(space => {
        space.classList.remove('red', 'flash');
        const trailer = space.querySelector('input').value.trim();
        space.classList.add(trailer ? trailerStatusColors[trailer] : 'green');
    });

    let found = false;
    allSpaces.forEach(space => {
        if (space.trailer.toLowerCase() === trailerNumber) {
            const isUpperPark = upperParkingSpaces.includes(space);
            const spaceElement = document.querySelector(`.trailer-input[data-number="${space.number}"][data-parking-lot-id="${isUpperPark ? 'upper-parking-lot' : 'lower-parking-lot'}"]`).parentElement;

            if (spaceElement) {
                spaceElement.classList.remove('yellow', 'green', 'empty', 'unknown', 'loaded', 'purple');
                spaceElement.classList.add('red');
                spaceElement.classList.add('flash');
                
                const resultDiv = document.createElement('div');
                resultDiv.className = 'search-result';
                resultDiv.textContent = `Trailer found: ${space.number} - ${space.trailer}`;
                searchResultContainer.appendChild(resultDiv);
                
                found = true;
            }
        }
    });

    if (!found) {
        const resultDiv = document.createElement('div');
        resultDiv.className = 'search-result';
        resultDiv.textContent = 'Trailer not found';
        searchResultContainer.appendChild(resultDiv);
    }
}

// Test Functions
function runTests() {
    console.log("Running tests...");

    // Test 1: Ensure trimming of trailing spaces
    const testInputElement = document.createElement('input');
    testInputElement.className = 'trailer-input';
    testInputElement.value = 'Trailer123   ';
    document.body.appendChild(testInputElement);

    trimTrailingSpaces();

    if (testInputElement.value === 'Trailer123') {
        console.log('Test 1 Passed: Trailing spaces removed');
    } else {
        console.error('Test 1 Failed: Trailing spaces not removed');
    }

    // Test 2: Validate update of trailer status
    const testTrailerNumber = 'TestTrailer';
    const testStatus = 'loaded';
    const testSpace = { number: 'L1', trailer: '', status: 'green' };
    upperParkingSpaces = [testSpace];

    updateTrailerStatus(testTrailerNumber, testStatus, false, '', 'upper-parking-lot', 'L1').then(() => {
        if (testSpace.trailer === testTrailerNumber && testSpace.status === testStatus) {
            console.log('Test 2 Passed: Trailer status updated');
        } else {
            console.error('Test 2 Failed: Trailer status not updated correctly');
        }
    }).catch(error => {
        console.error('Test 2 Failed with error: ', error);
    });

    // Cleanup test elements
    document.body.removeChild(testInputElement);
}

// Run the tests
runTests();
