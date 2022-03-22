import TimeEditAPI from '../src';


async function fetchCourse(timeEdit: TimeEditAPI, courseName: string) {
    const courseUrl = timeEdit.getCourseUrl(courseName);
    return timeEdit.getCourse(courseUrl);
}




const baseUrl = "https://www.kth.se/student/kurser/kurs/";
const courseName = "DD2482";
const timeEdit = new TimeEditAPI(baseUrl);


fetchCourse(timeEdit, courseName).then((courseObj) => {
    console.log(courseObj)
});


