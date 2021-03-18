export interface FirebaseBody {
	notification: FirebaseNotification;
	registration_ids?: string[];
	to?: string;
}

export interface FirebaseHeader {
	'Content-type': string;
	Authorization: string;
}

interface FirebaseNotification {
	body: string;
	title: string;
	click_action: string;
	icon: string;
}
