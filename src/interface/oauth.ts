export interface AxiosHeaders {
	'Content-Type': string;
	Authorization: string;
}

export interface PostCurlParams {
	grant_type: string;
	client_id: string;
	client_secret: string;
	redirect_uri: string;
	code: string;
}

export interface SnsMember {
	external_id: number;
	name?: string;
	nickname?: string;
	email?: string;
	thumbnail: string;
}
