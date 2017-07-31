import { combineReducers } from 'redux';
import getModuleStatusReducer from '../../lib/getModuleStatusReducer';


export function getCallMatchedReducer(types) {
  return (state = {}, { type, sessionId, toEntity }) => {
    if (type === types.setData) {
      state[sessionId] = toEntity;
      return { ...state };
    }
    return state;
  };
}
/* istanbul ignore next: unnecessary to test getModuleStatusReducer */
export default function getCallMonitorReducer(types) {
  return combineReducers({
    status: getModuleStatusReducer(types),
  });
}
