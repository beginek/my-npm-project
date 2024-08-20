// shared.js

const trailerData = {
    upperParkingSpaces: [
        { number: 'L1', trailer: '', status: 'empty' },
        { number: 'L2', trailer: '', status: 'empty' },
        { number: 'R3', trailer: '', status: 'empty' },
        // Add more spaces as needed
    ],
    lowerParkingSpaces: [
        { number: 'L1', trailer: '', status: 'empty' },
        { number: 'L2', trailer: '', status: 'empty' },
        { number: 'R3', trailer: '', status: 'empty' },
        // Add more spaces as needed
    ],
    currentTrailers: {},
    defectedTrailers: []
};

function loadTrailerData() {
    // Simulate loading data from a server or database
    return trailerData;
}

function saveTrailerData(data) {
    // Simulate saving data to a server or database
    Object.assign(trailerData, data);
}

function addTrailer(trailerNumber, trailerSpace) {
    const data = loadTrailerData();
    if (data.currentTrailers[trailerNumber]) {
        return `Trailer ${trailerNumber.toUpperCase()} is already in the park.`;
    } else {
        data.currentTrailers[trailerNumber] = trailerSpace;
        const space = data.upperParkingSpaces.concat(data.lowerParkingSpaces).find(space => space.number === trailerSpace);
        if (space) {
            space.trailer = trailerNumber;
            space.status = 'occupied';
            saveTrailerData(data);
            return `Trailer ${trailerNumber.toUpperCase()} has been added to space ${trailerSpace}.`;
        } else {
            return `Space ${trailerSpace} not found.`;
        }
    }
}

function removeTrailer(trailerNumber) {
    const data = loadTrailerData();
    if (data.currentTrailers[trailerNumber]) {
        const spaceNumber = data.currentTrailers[trailerNumber];
        delete data.currentTrailers[trailerNumber];
        const space = data.upperParkingSpaces.concat(data.lowerParkingSpaces).find(space => space.number === spaceNumber);
        if (space) {
            space.trailer = '';
            space.status = 'empty';
            saveTrailerData(data);
            return `Trailer ${trailerNumber.toUpperCase()} has been removed from space ${spaceNumber}.`;
        } else {
            return `Space ${spaceNumber} not found.`;
        }
    } else {
        return `Trailer ${trailerNumber.toUpperCase()} not found in the park.`;
    }
}

function searchTrailer(trailerNumber) {
    const data = loadTrailerData();
    return data.currentTrailers[trailerNumber] || null;
}

export { addTrailer, removeTrailer, searchTrailer, loadTrailerData, saveTrailerData };
