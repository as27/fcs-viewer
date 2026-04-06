export namespace main {
	
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
	    groups: string;
	
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
	        this.groups = source["groups"];
	    }
	}
	export class Settings {
	    publicKey: string;
	    baseURL: string;
	    tokenMasked: string;
	    configURL: string;
	    configError: string;
	
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
	    }
	}

}

