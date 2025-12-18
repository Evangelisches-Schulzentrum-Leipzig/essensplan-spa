const requestUrl = new URLSearchParams(window.location.search).get("requestUrl") || "https://api-url.de/public";
const referrerUrl = new URLSearchParams(window.location.search).get("referrerUrl") || "https://needed-referrer-url.de/";
const mandantId = new URLSearchParams(window.location.search).get("mandantId") || "";
const speiseplanNr = new URLSearchParams(window.location.search).get("speiseplanNr") || "";

/**
 * An object representing food allergens and their descriptions.
 * 
 * @constant {Object.<string, string>} allergene
 */
const allergene = {
    "A": "Glutenhaltige Getreide",
    "C": "Eier- und Eiererzeugnisse",
    "D": "Fisch- und Fischerzeugnisse",
    "E": "Erdnüsse und Erdnusserzeugnisse",
    "F": "Soja und Sojaerzeugnisse",
    "G": "Milch und Milcherzeugnisse",
    "H": "Schalenfrüchte",
    "I": "Sellerie und Sellerieerzeugnisse",
    "J": "Senf und Senferzeugnisse",
    "K": "Sesamsamen",
    "L": "Schwefeldioxid und Sulfite",
    "M": "Lupinen",
    "N": "Weichtiere",
    "B": "Krebstiere"
};
/**
 * An object representing food additives and their descriptions.
 * 
 * @constant {Object.<string, string>} zusatzstoffe
 */
const zusatzstoffe = {
    "1": "mit Konservierungsstoff",
    "2": "mit Farbstoff",
    "3": "mit Antioxydationsmittel",
    "4": "mit Süßungsmittel Saccarin",
    "5": "mit Süßungsmittel Cyclamat",
    "6": "mit Süßungsmittel Aspartam",
    "7": "mit Süßungsmittel Acesulfam",
    "8": "mit Phosphat",
    "9": "geschwefelt",
    "10": "chininhaltig",
    "11": "coffeinhaltig",
    "12": "mit Geschmacksverstärker",
    "13": "geschwärzt",
    "14": "gewachst",
    "15": "mit Schweinefleisch"
};

/**
 * @typedef {Object} TagesMenue
 * @property {number[]} allergeneIds
 * @property {number[]} bestellbarWenn
 * @property {string} bezeichnung
 * @property {boolean} gesperrt
 * @property {number[]} inhaltsstoffeIds
 * @property {number[]} zusatzstoffeIds
 * @property {string} kurzBez
 * @property {boolean} mehrfachbestellbar
 * @property {number} menueGruppe
 * @property {number} menueNr
 * @property {string} menueText
 * @property {string} menueTyp
 * @property {string} menueId
 * @property {number} portionsGroesse
 * @property {string} naehrwertMassTyp
 * @property {Array} naehrwerte
 * @property {null|string} symbol
 * @property {string} splanId
 * 
 * @typedef {Object} SpeiseplanTag
 * @property {string} datum
 * @property {Object.<number, TagesMenue>} tagesMenues
 * @property {boolean} feiertag
 *
 * @typedef {Object} bestellMsg
 * @property {string} name
 * @property {Array} params
 * @property {string} text
 * @property {string} typ
 */
/**
 * Fetches data from a remote API for a specified date range.
 *
 * @async
 * @function fetchData
 * @param {Date} dateStart - The start date of the range.
 * @param {Date} dateEnd - The end date of the range.
 * @returns {Promise<{code: number, content: {speiseplanTage: Object.<string, SpeiseplanTag>, bestellschlussMsg: bestellMsg[], splanPdfs: Object}}>} A promise that resolves to the JSON response from the API.
 * @throws {Error} Throws an error if the fetch operation fails.
 */
async function fetchData(dateStart, dateEnd) {
    // Helper function to format a date as YYYY-MM-DD
    const formatDate = (date) => date.toISOString().split('T')[0];

    // Construct the request payload
    const requestBody = {
        command: "speiseplan/mandantAPI_1_5",
        client: "web",
        parameter: {
            mandantId: mandantId,
            speiseplanNr: speiseplanNr,
            von: formatDate(dateStart),
            bis: formatDate(dateEnd),
        },
    };

    try {
        // Send the POST request to the API
        const response = await fetch(requestUrl, {
            method: "POST",
            headers: {
                Accept: "application/json, text/javascript, */*",
                "Content-Type": "application/json",
                Referrer: referrerUrl,
                "Sec-Fetch-Dest": "empty",
                "Sec-Fetch-Mode": "cors",
                "Sec-Fetch-Site": "cross-site",
            },
            body: JSON.stringify(requestBody),
        });

        // Check if the response is successful
        if (!response.ok) {
            throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
        }

        // Parse and return the JSON response
        return await response.json();
    } catch (error) {
        // Log and rethrow the error for further handling
        console.error("Error fetching data:", error);
        throw error;
    }
}

/**
 * Fetches the menus for the current day.
 *
 * This function retrieves the menu data for today's date by calling the `fetchData` function
 * with the current date as both the start and end date. It then extracts and returns the
 * daily menus (`tagesMenues`) for the current day from the fetched data.
 *
 * @async
 * @function getMenuesForToday
 * @returns {Promise<Object[]>} A promise that resolves to an array of menu objects for the current day.
 * @throws {Error} If the `fetchData` function fails or the expected data structure is not found.
 */
async function getMenuesForToday() {
    const today = new Date(); // Get the current date
    const formattedDate = today.toISOString().split('T')[0]; // Format the date as YYYY-MM-DD
    const data = await fetchData(today, today); // Fetch data for the current day

    // Extract and return the daily menus for the current day
    return data.content.speiseplanTage[formattedDate].tagesMenues || {};
}

/**
 * Asynchronously fetches and displays the menus for today in the specified container.
 * Filters out menus that are locked, contain "milch" (milk), or "allergie" (allergy) in their description.
 * Processes and sorts the menus before rendering them as HTML.
 * If no menus are available, displays a default message.
 *
 * @async
 * @function
 * @param {HTMLElement} container - The HTML container element where the menus will be displayed.
 * @returns {Promise<void>} A promise that resolves when the menus have been fetched and displayed.
 */
async function displayMenuesForToday(container) {
    try {
        // Initialize an empty HTML string
        let html = "";

        // Fetch today's menus
        const menues = await getMenuesForToday();

        // Process and sort the menus
        const processedMenues = Object.values(menues)
            .map(processMenueItem) // Process each menu item
            .sort(sortMenueItemsByMenueGroupePriority); // Sort by menu group priority

        // Iterate over the sorted menus
        for (const menue of processedMenues) {
            // Skip menus that are locked or contain "milch" or "allergie" in their description
            if (menue.gesperrt || 
                menue.bezeichnung.toLowerCase().includes("milch") || 
                menue.bezeichnung.toLowerCase().includes("allergie")) {
                continue;
            }

            // Append the menu details to the HTML string
            html += `<div class="menue-item">
                <h2>${menue.bezeichnung}</h2>
                <p>${menue.processed.menueTextWithBr}</p>
            </div>`;
        }

        // If no menus are available, display a default message
        if (!html || html.trim() === "") {
            html = "<div>Keine Menüs verfügbar.</div>";
        }

        // Update the container's inner HTML
        container.innerHTML = html;
    } catch (error) {
        // Handle errors (e.g., network issues, unexpected data structure)
        console.error("Error displaying menus:", error);
        container.innerHTML = "<div>Fehler beim Laden der Menüs.</div>";
    }
}

/**
 * Processes a menu item to extract and format its text, additives, and allergens.
 *
 * @param {TagesMenue} menueItem - The menu item to process.
 * @returns {TagesMenue & {processed: {bezeichnung: string, menueTextWithBr: string, menueTextWithSpaces: string, additives: string[], additivesIds: string[], allergene: string[], allergeneIds: string[]}}}
 */
function processMenueItem(menueItem) {
    // Clone the menu item to avoid mutating the original
    const newItem = { ...menueItem };
    newItem.processed = {};

    // Split menu text by [br], trim whitespace
    let splitMenueText = menueItem.menueText.split('[br]').map(s => s.trim());

    // Remove last line if it contains allergens/additives info (usually in parentheses)
    if (splitMenueText.length && /\([^)]+\)/.test(splitMenueText[splitMenueText.length - 1])) {
        splitMenueText.pop();
    }

    // Remove additive markers like (1), (2,3), etc. from each line
    splitMenueText = splitMenueText.map(s => s.replace(/\((?:[1-9]|1[0-5])(?:,[1-9]|,1[0-5])*\)/g, ''));

    // Ensure commas are followed by a space for better readability
    splitMenueText = splitMenueText.map(s => s.replace(/,([^ ])/g, ', $1'));

    // Join lines for different display formats
    newItem.processed.menueTextWithBr = splitMenueText.join('<br/>');
    newItem.processed.menueTextWithSpaces = splitMenueText.join(' ');

    // Extract additive IDs (e.g., (1), (2,3), etc.)
    let additives = [];
    const additiveMatches = menueItem.menueText.match(/\((?:[1-9]|1[0-5])(?:,[1-9]|,1[0-5])*\)/g);
    if (additiveMatches) {
        additives = additiveMatches
            .flatMap(s => s.replace(/[()]/g, '').split(','))
            .filter(Boolean);
    }

    // Extract allergen codes (e.g., (A), (A,G,I), etc.)
    let allergeneIds = [];
    const allergenMatches = menueItem.menueText.match(/\(([A-Z](?:,[A-Z])*)\)/g);
    if (allergenMatches) {
        allergeneIds = allergenMatches
            .flatMap(s => s.replace(/[()]/g, '').split(','))
            .filter(Boolean);
    }

    // Map IDs to their descriptions
    newItem.processed.additives = additives.map(id => zusatzstoffe[id]).filter(Boolean);
    newItem.processed.additivesIds = additives;
    newItem.processed.allergene = allergeneIds.map(code => allergene[code]).filter(Boolean);
    newItem.processed.allergeneIds = allergeneIds;

    return newItem;
}

/**
 * Sorts menu items based on the priority of their menu group in descending order.
 *
 * @param {Object} a - The first menu item to compare.
 * @param {Object} b - The second menu item to compare.
 * @param {number} a.menueGruppe - The menu group priority of the first item.
 * @param {number} b.menueGruppe - The menu group priority of the second item.
 * @returns {number} A positive number if `b.menueGruppe` is greater than `a.menueGruppe`,
 *                   a negative number if `a.menueGruppe` is greater than `b.menueGruppe`,
 *                   or 0 if they are equal.
 */
function sortMenueItemsByMenueGroupePriority(a, b) {
    return b.menueGruppe - a.menueGruppe;
}

var container = document.querySelector("#menues-container");
displayMenuesForToday(container);