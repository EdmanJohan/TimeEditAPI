'use strict'
import fetch from 'node-fetch';

class TimeEditAPI {
    baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    } 
 
    async getCourse(courseId: string) {
        return new Promise((resolve, reject) => {
            const courseURL = this.getCourseUrl(courseId);
            fetch(courseURL)
                .then()

/*             fetch(courseURL)
                .then((response) => {
                    if (!response.ok) {
                        throw new Error('Network response was not OK.');
                    }
                    
                    
                    const data = response.body;

                    console.log("Response", data);
                    return resolve(data);
                })
                .catch((error) => {
                    return reject(error);
                }); */
        });
    }

    /**
     * 
     * @param courseId 
     * @returns 
     */
    getCourseUrl(courseId: string): string {
        return `${this.baseUrl}ri.json?h=f&sid=3&p=0.m%2C12.n&objects=${courseId}&ox=0&types=0&fe=0&h2=f`;
    }
}

export = TimeEditAPI;
