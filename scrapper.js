const fs = require("fs");
const cheerio = require("cheerio");
const request = require("request");
const path = require("path");
const xlsx = require("xlsx");
const directory = path.join(__dirname, "ipl");
createdir(directory);
const { O_DIRECTORY } = require("constants");
const { doesNotReject } = require("assert");



let url = "https://www.espncricinfo.com/series/ipl-2020-21-1210595";

request(url, cb);

function cb(error, response, html) {
    if (error) {
        console.log("Encountered some error !! Try Again Later");
    } else {
        gotonext(html);
    }
}

/*This function moves us to next page by extracting url of a specific button*/

function gotonext(data) {
    let $ = cheerio.load(data);
    let linktag = $("li.widget-items.cta-link").find("a");

    let url = "https://www.espncricinfo.com/" + $(linktag).attr("href");

    request(url, callback);

    function callback(error, response, html) {
        if (error) {
            console.log(error);
            console.log("Encountered some error in going next !! Try Again Later");
        } else {
            resultpage(html);
        }
    }

}


/*Now we are having result page info 
Next steps are as follows
->Move to each and every result page
->extract the info of all matches
->save info of all batsman in their respective team folder and in their respective excel sheet
->what to save -> venue date opponent result runs balls fours sixes sr  

*/

function resultpage(data) {
    let $ = cheerio.load(data);


    let containerarray = $(".league-scores-container .match-score-block .match-cta-container");

    for (let i = 0; i < containerarray.length; i++) {
        let a_tags = $(containerarray[i]).find("a");
        let resulturl = "https://www.espncricinfo.com/" + $(a_tags[2]).attr("href");

        request(resulturl, cb);

        function cb(error, response, html) {
            if (error) {
                console.log("Encountered some error ub result page !! Try Again Later");
            } else {
                resultextracter(html);
            }
        }

    }



}

let i = 0;

function resultextracter(data) {
    let $ = cheerio.load(data);
    let venueinfo = $(".match-header .description");
    let venue = venueinfo.text().split(",")[1].trim();
    let date = venueinfo.text().split(",")[2].trim();

    let resultinfo = $(".match-header .status-text>span");

    let result = resultinfo.text();

    let innings = $(".match-scorecard-table .Collapsible");

    for (let i = 0; i < innings.length; i++) {
        let team = $(innings[i]).find(".header-title.label").text().split("INNINGS")[0].trim();
        let opponent = $(innings[((!i) >>> 0)]).find(".header-title.label").text().split("INNINGS")[0].trim();

        let tabledata = $(innings[i]).find(".table.batsman tbody tr");
        for (let j = 0; j < tabledata.length; j++) {
            let checker = $(tabledata[j]).find("td");
            if ($(checker[0]).hasClass("batsman-cell")) {
                let name = $(checker[0]).text();
                let runs = $(checker[2]).text();
                let balls = $(checker[3]).text();
                let fours = $(checker[5]).text();
                let sixes = $(checker[6]).text();
                let sr = $(checker[7]).text();
                processPlayer(team, name, opponent, venue, date, runs, balls, fours, sixes, sr);
                console.log(team, name, opponent, venue, date, runs, balls, fours, sixes, sr);
            }
        }
    }



}

function createdir(filepath) {
    if (fs.existsSync(filepath) == false) {
        fs.mkdirSync(filepath);
    }
}

function processPlayer(team, name, opponent, venue, date, runs, balls, fours, sixes, sr) {
    let teampath = path.join(directory, team);
    createdir(teampath);

    let filepath = path.join(teampath, name + ".xls");

    let data = excelReader(filepath, name);

    let content = {
        team,
        name,
        opponent,
        venue,
        date,
        runs,
        balls,
        fours,
        sixes,
        sr
    }
    data.push(content);

    excelWriter(filepath, data, name);
}

function excelReader(sheetpath, sheetname) {
    if (fs.existsSync(sheetpath) == false) {
        return [];
    }
    let workbook = xlsx.readFile(sheetpath);
    let data = workbook.Sheets[sheetname];
    let json_data = xlsx.utils.sheet_to_json(data);

    return json_data;
}

function excelWriter(sheetpath, json_data, sheetname) {
    let new_work_book = xlsx.utils.book_new();
    let data = xlsx.utils.json_to_sheet(json_data);
    xlsx.utils.book_append_sheet(new_work_book, data, sheetname);
    xlsx.writeFile(new_work_book, sheetpath);

}