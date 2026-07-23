import { configureStore } from '@reduxjs/toolkit'
import authReducer from '../features/auth/authSlice'
import searchReducer from '../features/search/searchSlice'
import { coreApi } from '../features/core/coreApi'
import { consoleApi } from '../features/console/consoleApi'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    search: searchReducer,
    [coreApi.reducerPath]: coreApi.reducer,
    [consoleApi.reducerPath]: consoleApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(coreApi.middleware, consoleApi.middleware),
})
