import { DateTime } from 'luxon';
import TimeEditAPI from '../src';

async function fetchCourseEvents(timeEdit: TimeEditAPI, courseName: string) {
    const courseCode = await timeEdit.getCourseId(courseName);
    return timeEdit.getCourseEvents(courseCode)
}


const baseUrl = "https://cloud.timeedit.net/kth/web/public01/";
const courseName = "DD2482";
const timeEdit = new TimeEditAPI({ baseUrl: baseUrl, filterEmpty: true, useKTHPlaces: false });


fetchCourseEvents(timeEdit, courseName).then((courseEvents) => {
    courseEvents.forEach(event => {
        const startTime = event.startDate.setLocale('se').toLocaleString(DateTime.DATETIME_SHORT);
        const endTime = event.endDate.setLocale('se').toLocaleString(DateTime.DATETIME_SHORT);
        console.log(`Start:\t\t${startTime}\nEnd:\t\t${endTime}\nLecturers:\t${event.lecturers}\nLocation:\t${event.location}\nType:\t\t${event.type}\n`)
    });
});


