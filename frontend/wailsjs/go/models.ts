export namespace main {
	
	export class BankAccountInfo {
	    id: number;
	    name: string;
	    iban: string;
	    balance: number;
	
	    static createFrom(source: any = {}) {
	        return new BankAccountInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.iban = source["iban"];
	        this.balance = source["balance"];
	    }
	}
	export class BookingRow {
	    id: number;
	    date: string;
	    amount: number;
	    receiver: string;
	    description: string;
	
	    static createFrom(source: any = {}) {
	        return new BookingRow(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.date = source["date"];
	        this.amount = source["amount"];
	        this.receiver = source["receiver"];
	        this.description = source["description"];
	    }
	}
	export class InvoiceRow {
	    id: number;
	    invNumber: string;
	    date: string;
	    receiver: string;
	    totalPrice: number;
	    paymentDifference: number;
	    description: string;
	    charge: number;
	    chargeback: number;
	    refNumber: string;
	
	    static createFrom(source: any = {}) {
	        return new InvoiceRow(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.invNumber = source["invNumber"];
	        this.date = source["date"];
	        this.receiver = source["receiver"];
	        this.totalPrice = source["totalPrice"];
	        this.paymentDifference = source["paymentDifference"];
	        this.description = source["description"];
	        this.charge = source["charge"];
	        this.chargeback = source["chargeback"];
	        this.refNumber = source["refNumber"];
	    }
	}
	export class CachedData___main_InvoiceRow_ {
	    updatedAt: string;
	    data: InvoiceRow[];
	
	    static createFrom(source: any = {}) {
	        return new CachedData___main_InvoiceRow_(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.updatedAt = source["updatedAt"];
	        this.data = this.convertValues(source["data"], InvoiceRow);
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
	    age: number;
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
	        this.age = source["age"];
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
	export class CachedData___main_MemberRow_ {
	    updatedAt: string;
	    data: MemberRow[];
	
	    static createFrom(source: any = {}) {
	        return new CachedData___main_MemberRow_(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.updatedAt = source["updatedAt"];
	        this.data = this.convertValues(source["data"], MemberRow);
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
	export class LocationRow {
	    id: number;
	    name: string;
	    description: string;
	    street: string;
	    city: string;
	    zip: string;
	    country: string;
	
	    static createFrom(source: any = {}) {
	        return new LocationRow(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.description = source["description"];
	        this.street = source["street"];
	        this.city = source["city"];
	        this.zip = source["zip"];
	        this.country = source["country"];
	    }
	}
	export class InventoryGroupRow {
	    id: number;
	    name: string;
	    description: string;
	    itemCount: number;
	
	    static createFrom(source: any = {}) {
	        return new InventoryGroupRow(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.description = source["description"];
	        this.itemCount = source["itemCount"];
	    }
	}
	export class InventoryItemRow {
	    id: number;
	    name: string;
	    identifier: string;
	    description: string;
	    pieces: number;
	    price: number;
	    purchaseDate: string;
	    locationName: string;
	    lendingAvailable: boolean;
	
	    static createFrom(source: any = {}) {
	        return new InventoryItemRow(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.identifier = source["identifier"];
	        this.description = source["description"];
	        this.pieces = source["pieces"];
	        this.price = source["price"];
	        this.purchaseDate = source["purchaseDate"];
	        this.locationName = source["locationName"];
	        this.lendingAvailable = source["lendingAvailable"];
	    }
	}
	export class InventoryOverview {
	    items: InventoryItemRow[];
	    groups: InventoryGroupRow[];
	    locations: LocationRow[];
	
	    static createFrom(source: any = {}) {
	        return new InventoryOverview(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.items = this.convertValues(source["items"], InventoryItemRow);
	        this.groups = this.convertValues(source["groups"], InventoryGroupRow);
	        this.locations = this.convertValues(source["locations"], LocationRow);
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
	export class CachedData_main_InventoryOverview_ {
	    updatedAt: string;
	    data: InventoryOverview;
	
	    static createFrom(source: any = {}) {
	        return new CachedData_main_InventoryOverview_(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.updatedAt = source["updatedAt"];
	        this.data = this.convertValues(source["data"], InventoryOverview);
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
	export class FinanceOverview {
	    incomeMonth: number;
	    expenseMonth: number;
	    balanceMonth: number;
	    openInvoices: number;
	    invoiceCount: number;
	
	    static createFrom(source: any = {}) {
	        return new FinanceOverview(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.incomeMonth = source["incomeMonth"];
	        this.expenseMonth = source["expenseMonth"];
	        this.balanceMonth = source["balanceMonth"];
	        this.openInvoices = source["openInvoices"];
	        this.invoiceCount = source["invoiceCount"];
	    }
	}
	
	
	
	
	export class InvoiceItemRow {
	    id: number;
	    title: string;
	    description: string;
	    quantity: number;
	    unitPrice: number;
	    taxRate: number;
	    taxName: string;
	    gross: boolean;
	
	    static createFrom(source: any = {}) {
	        return new InvoiceItemRow(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.title = source["title"];
	        this.description = source["description"];
	        this.quantity = source["quantity"];
	        this.unitPrice = source["unitPrice"];
	        this.taxRate = source["taxRate"];
	        this.taxName = source["taxName"];
	        this.gross = source["gross"];
	    }
	}
	
	
	
	export class Settings {
	    version: string;
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
	        this.version = source["version"];
	        this.publicKey = source["publicKey"];
	        this.baseURL = source["baseURL"];
	        this.tokenMasked = source["tokenMasked"];
	        this.configURL = source["configURL"];
	        this.configError = source["configError"];
	        this.activeModules = source["activeModules"];
	    }
	}

}

