import { getModel } from '../database'

const Version = getModel('Version')

export const getRecentVersionId = async () => {
    const response = await Version.findOne({attributes: ['id'], order: [['id', 'DESC']]})
    
    // Return
    return response.id;
}

export const  getVersionIdByVersionName = async (versionName) => {
    const response = await Version.findOne({where: { name: versionName }, attributes: ['id']})

    // Return
    return response.id;
}