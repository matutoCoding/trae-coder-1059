export default defineAppConfig({
  pages: [
    'pages/order/index',
    'pages/schedule/index',
    'pages/dispatch/index',
    'pages/bill/index',
    'pages/vehicle-detail/index',
    'pages/order-detail/index',
    'pages/vehicle-add/index',
    'pages/order-submit/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#1E88E5',
    navigationBarTitleText: '冷链智运',
    navigationBarTextStyle: 'white',
    backgroundColor: '#F0F7FF'
  },
  tabBar: {
    color: '#90A4AE',
    selectedColor: '#1E88E5',
    backgroundColor: '#FFFFFF',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/order/index',
        text: '运输订单'
      },
      {
        pagePath: 'pages/schedule/index',
        text: '车辆排期'
      },
      {
        pagePath: 'pages/dispatch/index',
        text: '智能分配'
      },
      {
        pagePath: 'pages/bill/index',
        text: '账单中心'
      }
    ]
  }
})
