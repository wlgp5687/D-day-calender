import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import csrf from 'csurf';
import { GraphQLServer } from 'graphql-yoga';
import routes from './routers/router';
import graphqlContext from './services/context';
import schema from './routers/graphlRouters/schema';

const { PORT } = process.env;

const server = new GraphQLServer({
	schema,
	context: async (req) => {
		return {
			req: req.request,
			decoded_token: await graphqlContext(req.request),
		};
	},
});

server.use(helmet());
server.use(bodyParser.json({ limit: '1mb' }));
server.use(bodyParser.urlencoded({ limit: '1mb', extended: false }));
server.use(cookieParser());

server.use(
	cors({
		origin: ['http://localhost:3000'],
		credentials: true,
	}),
);
server.use(csrf({ cookie: true, ignoreMethods: ['GET', 'HEAD', 'POST', 'OPTIONS'] }));

const app = server.express;

server.use(morgan('dev'));

server.start({ port: PORT, playground: process.env.GRAPHQL_PLAY_GROUND, endpoint: process.env.GRAPHQL_END_POINT }, () => {
	console.log('💻 Graphql Server Running');
	routes(app);
});

/*
    morgan - 설치
    helmet - 설치
    cors -설치
    jsonwebtoken - 설치
    csruf - 설치
    cookie-parser - 설치
    bodyparser - 설치
    dotenv - 설치
    

    mysql2 - 설치
    sequelize- 설치
    redis - 설치

    # graphql - 설치
    graphql-yoga
    merge-graphql-schemas 
    graphql-tools
    path
    
    # babel
    babel-cli
    babel/core
    babel/node
    babel/plugin-proposal-optional-chaining
    babel/preset-stage-0
    babel/register

    pm2 - 설치
    
    npm i -D eslint eslint-config-airbnb-base eslint-plugin-import
    npm i -D @typescript-eslint/eslint-plugin @typescript-eslint/parser
    npm install -D eslint-config-prettier
    npm install -D eslint-plugin-prettier
    ts
*/
