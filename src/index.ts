/**
 * TimeEdit API for KTH TimeEdit
 * Inspired by timeedit-api
 * @author Johan Edman
 */
'use strict'
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { DateTime } from "luxon";

class TimeEditAPI {
    readonly baseUrl: string;
    filterEmpty: boolean;
    filterStartDate: string;
    filterEndDate: string;
    filterToSemester: boolean;
    useKTHPlaces: boolean;

    /**
     * Initalizes a TimeEdit instance for a certain URL.
     * @param baseUrl - Url for TimeEdit - E.g. "https://cloud.timeedit.net/kth/web/public01/"
     */
    constructor({ baseUrl = null, filterEmpty = false, filterToSemester = true, startDate = null, endDate = null, useKTHPlaces = false }: { baseUrl: string, filterEmpty?: boolean, filterToSemester?: boolean, startDate?: string, endDate?: string, useKTHPlaces?: boolean }) {
        this.baseUrl = baseUrl;
        this.filterEmpty = filterEmpty;
        this.filterToSemester = filterToSemester;
        this.filterStartDate = startDate;
        this.filterEndDate = endDate;
        this.useKTHPlaces = useKTHPlaces;
    }

    /**
     * Function: getCourseEvents
     * Description: Returns a list of 'events' containing course calendar events.
     * @param courseId - Id of course.
     * @returns list of events
     */
    async getCourseEvents(courseId: string) {
        const courseURL = this.getCourseUrl(courseId);
        const response = await fetch(courseURL);

        try {
            checkStatus(response);
        } catch (error) {
            console.error(error);
            const errorBody = await error.response.text();
            console.error(`Error body: ${errorBody}`);
        }

        const jsonData = await response.json();

        let courseEvents = jsonData.reservations
            .map((event: { startdate: string; starttime: string; enddate: string, endtime: string; columns: any[]; }) => {
                return {
                    startDate: DateTime.fromISO(`${event.startdate}T${event.starttime}`),
                    endDate: DateTime.fromISO(`${event.enddate}T${event.endtime}`),
                    lecturers: event.columns[3].split(", "),
                    location: this.useKTHPlaces ? (this.getKTHLocationURL(event.columns[4].split(", "))) : event.columns[4].split(", "),
                    type: event.columns[5],
                };
            });

        if (this.filterToSemester) {
            courseEvents = courseEvents.filter(this.eventInCurrentKTHPeriod);
        }

        if (this.filterEmpty) {
            courseEvents = courseEvents.filter(this.filterEmptyEvents);
        }

        if (this.filterStartDate) {
            courseEvents = courseEvents.filter(this.eventBeforeDate)
        }

        return courseEvents;
    }

    async getCourseId(courseCode: string) {
        const $ = await this.parseHTML(this.getSearchURL(courseCode, 5));
        return $('#objectbasketitemX0').attr('data-idonly');
    }

    /**
     * Function: getCourseUrl
     * Description: Constructs the CourseURL for TimeEdit
     * @param courseId - CourseId
     * @returns CourseURL
     */
    getCourseUrl(courseId: string): string {
        return `${this.baseUrl}ri.json?h=f&sid=3&p=0.m%2C12.n&objects=${courseId}&ox=0&types=0&fe=0&h2=f`;
    }

    /**
     * Function: getSearchURL
     * Description: Constructs the Search URL
     * @param searchText CourseCode
     * @param type Type of schedule
     * @returns string 
     */
    getSearchURL(searchText: string, type: number): string {
        return `${this.baseUrl}objects.html?max=1&fr=t&partajax=t&im=f&sid=3&search_text=${searchText}&types=${type}`;
    }

    /**
     * Function: getKTHLocationURL
     * Description: Replaces KTH place name with URL to location.
     * @param locations KTH Places, name of location
     * @returns Array of URL strings
     */
    getKTHLocationURL(locations: string[]) {
        // TODO: Would be nice to link directly to KTH Place URL, however locations are UUID hashed. Seed?
        let urls = [];

        locations.forEach(location => {
            let locString = location.replace("§", "");
            urls.push(`https://www.kth.se/search?q=${locString}&entityFilter=kth-place&filterLabel=Facilities&lang=en`);
        });

        return urls;
    }

    /**
     * Function: filterEmptyEvents
     * Description: Filter events based on empty fields.
     * @param event 
     * @returns 
     */
    filterEmptyEvents(event: { lecturers: string[]; location: string[]; type: string; }) {
        if (event.lecturers.length == 0) {
            return false;
        }

        if (event.location.length == 0) {
            return false;
        }

        if (event.type == '') {
            return false;
        }

        return true;
    }

    /**
     * Function: eventInCurrentKTHPeriod
     * Description: 
     * @param event 
     * @returns 
     */
    eventInCurrentKTHPeriod(event: { startDate: DateTime }): true | false {
        // TODO: Fetch semester dates automatically from site.
        // const periodBaseUrl = "https://www.kth.se/student/studier/schema/lasarsindelning/"
        const dt = DateTime.now();

        let currentSemester: number[];
        if (1 < dt.month && dt.month < 7) {
            currentSemester = [1, 2, 3, 4, 5, 6];
        } else if (7 < dt.month && dt.month <= 12) {
            currentSemester = [8, 9, 10, 11, 12];
        } else {
            currentSemester = [];
        }

        return currentSemester.includes(event.startDate.month) && dt.hasSame(event.startDate, 'year');
    }

    eventBeforeDate(event: { endDate: DateTime; }) {
        return event.endDate < DateTime.fromSQL(this.filterStartDate);
    }

    eventAfterDate(event: { startDate: DateTime; }) {
        return event.startDate < DateTime.fromSQL(this.filterEndDate)
    }

    /**
     * Function: parseHTML
     * Description: Parses the HTML response from TimeEdit returns a cheerio object
     * @param url TimEdit URL
     * @returns Cheerio object
     */
    async parseHTML(url: string) {
        const response = await fetch(url);

        try {
            checkStatus(response);
        } catch (error) {
            console.error(error);
            const errorBody = await error.response.text();
            console.error(`Error body: ${errorBody}`);
        }

        const data = await response.text();
        return cheerio.load(data);
    }


}

class HTTPResponseError extends Error {
    response: { ok?: any; status?: any; statusText?: any; };

    constructor(response: { ok?: any; status?: any; statusText?: any; }) {
        super(`HTTP Error Response: ${response.status} ${response.statusText}`);
        this.response = response;
    }
}

/**
 * Function: checkStatus
 * Description: Checks for network errors, if in range of 200 - 300 then OK, else error.
 * @param response response object.
 * @returns resposne object if OK, else error.
 */
const checkStatus = (response: { ok: any; }) => {
    if (response.ok) {
        return response;
    } else {
        throw new HTTPResponseError(response);
    }
}

export = TimeEditAPI;
