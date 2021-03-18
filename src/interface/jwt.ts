export interface DecodeToken {
	csrf: string;
	data: Data;
	uuid: string;
	iat: number;
	exp: number;
	iss: string;
}

export interface RedisToken {
	ac_token: string;
	re_token: string;
}

export interface Data {
	member_id: number;
	external?: External;
	email?: string;
}

interface External {
	channel: string;
}
