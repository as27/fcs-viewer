export namespace main {
	
	export class CalendarEvent {
	    id: number;
	    name: string;
	    start: string;
	    end: string;
	    allDay: boolean;
	    calendarId: number;
	    calendarName: string;
	    color: string;
	    type: string;
	
	    static createFrom(source: any = {}) {
	        return new CalendarEvent(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.start = source["start"];
	        this.end = source["end"];
	        this.allDay = source["allDay"];
	        this.calendarId = source["calendarId"];
	        this.calendarName = source["calendarName"];
	        this.color = source["color"];
	        this.type = source["type"];
	    }
	}
	export class CalendarInfo {
	    id: number;
	    name: string;
	    color: string;
	
	    static createFrom(source: any = {}) {
	        return new CalendarInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.color = source["color"];
	    }
	}
	export class GroupDetail {
	    id: number;
	    short: string;
	    name: string;
	    description: string;
	    notFound: boolean;
	
	    static createFrom(source: any = {}) {
	        return new GroupDetail(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.short = source["short"];
	        this.name = source["name"];
	        this.description = source["description"];
	        this.notFound = source["notFound"];
	    }
	}
	export class DepartmentDetail {
	    name: string;
	    groups: GroupDetail[];
	
	    static createFrom(source: any = {}) {
	        return new DepartmentDetail(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.groups = this.convertValues(source["groups"], GroupDetail);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class MemberRow {
	    id: number;
	    membershipNumber: string;
	    firstName: string;
	    familyName: string;
	    email: string;
	    phone: string;
	    mobile: string;
	    dateOfBirth: string;
	    street: string;
	    zip: string;
	    city: string;
	    joinDate: string;
	    resignationDate: string;
	    groups: string;
	    groupShorts: string;
	
	    static createFrom(source: any = {}) {
	        return new MemberRow(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.membershipNumber = source["membershipNumber"];
	        this.firstName = source["firstName"];
	        this.familyName = source["familyName"];
	        this.email = source["email"];
	        this.phone = source["phone"];
	        this.mobile = source["mobile"];
	        this.dateOfBirth = source["dateOfBirth"];
	        this.street = source["street"];
	        this.zip = source["zip"];
	        this.city = source["city"];
	        this.joinDate = source["joinDate"];
	        this.resignationDate = source["resignationDate"];
	        this.groups = source["groups"];
	        this.groupShorts = source["groupShorts"];
	    }
	}
	export class Settings {
	    publicKey: string;
	    baseURL: string;
	    tokenMasked: string;
	    configURL: string;
	    configError: string;
	    activeModules: string[];
	
	    static createFrom(source: any = {}) {
	        return new Settings(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.publicKey = source["publicKey"];
	        this.baseURL = source["baseURL"];
	        this.tokenMasked = source["tokenMasked"];
	        this.configURL = source["configURL"];
	        this.configError = source["configError"];
	        this.activeModules = source["activeModules"];
	    }
	}

}

