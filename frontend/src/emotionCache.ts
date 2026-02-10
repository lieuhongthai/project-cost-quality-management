import createCache from '@emotion/cache';

// Tạo Emotion cache với prepend: true để MUI styles được inject trước
// CSS Layer sẽ được xử lý bởi StyledEngineProvider
export const muiCache = createCache({
  key: 'mui',
  prepend: true, // Đảm bảo MUI styles được inject ở đầu <head>
});

export default muiCache;
