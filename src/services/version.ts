import * as versionComponent from '../component/version'

export const getVersionIdByVersionName = async (versionName) => {
    const response = await versionComponent.getVersionIdByVersionName(versionName)
    return response;
}