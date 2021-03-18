import { fileLoader, mergeResolvers, mergeTypes } from 'merge-graphql-schemas';
import path from 'path';
import { makeExecutableSchema } from 'graphql-tools';

const env = process.env.NODE_ENV || 'development';

const allTypes = fileLoader(path.join(__dirname, '/**/*.graphql'));
const allResolvers = fileLoader(path.join(__dirname, env === 'production' ? '/**/*.js' : '/**/*.ts'));

const schema = makeExecutableSchema({ typeDefs: mergeTypes(allTypes), resolvers: mergeResolvers(allResolvers) });

export default schema;
