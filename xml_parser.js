const fs = require('fs');
const xml2js = require('xml2js');
const util = require('util');
const moment = require('moment');
const path = require("path");
const _ = require("underscore");
const filePath = "//200.72.154.98/d$/MICROS/OPERA/export/OPERA/htj/";

async function GetlastOne(dir) {
	let files = fs.readdirSync(dir);
	// use underscore for max()
	let file = _.max(files, (f) => {
		var fullpath = path.join(dir, f);
		// ctime = creation time is used
		// replace with mtime for modification time
		return fs.statSync(fullpath).ctime;
	});

	let extension = file.split('.')
	console.log('extension: ', extension)

	if (extension[1] !== 'xml') {
		return -1
	}
	return dir + file
}

async function filteringRooms(json) {

	let day = parseInt(moment().format('D'), 10)
	let specificIndex = day - 2
	let rooms = json.DETAIL_AVAIL.LIST_G_5[0].G_5[0].LIST_DAY[0].DAY
	let roomsFromToday = rooms.filter((value, index) => index >= specificIndex);
	return roomsFromToday.map(q => {
		return {
			BUSINESS_DATE: q.BUSINESS_DATE[0],
			LIST_ROOM_TYPE: q.LIST_ROOM_TYPE[0].ROOM_TYPE.map(z => {
				return {
					MARKET_CODE: z.MARKET_CODE[0],
					DETAIL: z.LIST_DETAIL[0].DETAIL[0].NO_OF_ROOMS1[0]
				}
			})
		}
	})
}

async function getJson(file) {

	fs.readFile(file, async function (err, data) {
		if (err) console.log(err);

		const parser = new xml2js.Parser();
		parser.parseString(data, async function (err, result) {
			if (err) console.log(err);

			console.log('we got the json');
			console.log('we are filtering...', typeof result)
			let availableRooms = await filteringRooms(result);
			console.log('we are saving...')
			savejson(availableRooms)
		});
	});

}

async function savejson(data) {

	let json = JSON.stringify(data);

	fs.writeFile("output.json", json, 'utf8', function (err) {
		if (err) {
			console.log("An error occured while writing JSON Object to File.");
			process.exit(1)
		}

		console.log("JSON file has been saved.");
		process.exit(1)
	});
}

async function main() {
	
	setInterval(async function () {
		let date = new Date();
		if (date.getSeconds() === 0) {
			let file = await GetlastOne(filePath)
			if (file !== -1) {
				console.log(`extracting the next file: ${file}`)
				 getJson(file);

			} else {
				console.log(file, ' is not a json.')
				process.exit(1)
			}
		}
	}, 2000);
}

main();
