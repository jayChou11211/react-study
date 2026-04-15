jest.mock('dva/fetch', () => jest.fn())
jest.mock('antd', () => ({
  notification: {
    error: jest.fn(),
  },
  message: {},
  description: {},
}))
jest.mock('dva/router', () => ({
  routerRedux: {
    push: jest.fn((path) => ({ type: '@@router/CALL_HISTORY_METHOD', payload: path })),
  },
}))
jest.mock('@/main', () => ({
  __esModule: true,
  default: {
    dispatch: jest.fn(),
  },
}))
jest.mock('../utils', () => ({
  getQueryString: jest.fn(),
}))

const request = require('../request').default
const fetch = require('dva/fetch')
const { routerRedux } = require('dva/router')
const store = require('@/main').default
const { getQueryString } = require('../utils')

describe('utils/request interceptors', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    localStorage.setItem('token', 'token-123')
    localStorage.setItem('appId', 'app-456')
    window.history.pushState({}, '', 'http://localhost/#/main')
  })

  it('applies request interceptor headers and stringifies json body', async () => {
    fetch.mockResolvedValue({
      status: 200,
      json: () => Promise.resolve({ data: { ok: true } }),
    })

    const res = await request('/api/demo', {
      method: 'POST',
      body: { name: 'jay' },
      headers: {
        'X-Trace': 'abc',
      },
    })

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith(
      '/api/demo',
      expect.objectContaining({
        credentials: 'include',
        method: 'POST',
        body: JSON.stringify({ name: 'jay' }),
        headers: expect.objectContaining({
          Accept: 'application/json',
          'Content-Type': 'application/json; charset=utf-8',
          Authorization: 'token-123',
          appId: 'app-456',
          'X-Trace': 'abc',
        }),
      }),
    )
    expect(res).toEqual({ data: { ok: true } })
  })

  it('applies response interceptor and dispatches login redirect on 401', async () => {
    fetch.mockResolvedValue({
      status: 200,
      json: () => Promise.resolve({ data: { code: 401 } }),
    })

    const action = { type: '@@router/CALL_HISTORY_METHOD', payload: '/login?redirct=/main' }
    routerRedux.push.mockReturnValue(action)

    await request('/api/private', { method: 'GET' })

    expect(routerRedux.push).toHaveBeenCalledWith('/login?redirct=/main')
    expect(store.dispatch).toHaveBeenCalledWith(action)
    expect(getQueryString).not.toHaveBeenCalled()
  })

  it('falls back to root redirect when hash route is missing on 401', async () => {
    window.history.pushState({}, '', 'http://localhost/')
    fetch.mockResolvedValue({
      status: 200,
      json: () => Promise.resolve({ data: { code: 401 } }),
    })

    const action = { type: '@@router/CALL_HISTORY_METHOD', payload: '/login?redirct=/' }
    routerRedux.push.mockReturnValue(action)

    await request('/api/private', { method: 'GET' })

    expect(routerRedux.push).toHaveBeenCalledWith('/login?redirct=/')
    expect(store.dispatch).toHaveBeenCalledWith(action)
  })

  it('handles non-2xx response in interceptor and returns error object', async () => {
    fetch.mockResolvedValue({
      status: 500,
      url: '/api/fail',
      statusText: 'Server Error',
    })

    const res = await request('/api/fail', { method: 'GET' })

    expect(res).toBeInstanceOf(Error)
    expect(res.message).toBe('Server Error')
    expect(res.response).toEqual(
      expect.objectContaining({
        status: 500,
        url: '/api/fail',
      }),
    )
  })
})
