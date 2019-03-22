export const RECEIVE_IMAGE = 'RECEIVE_IMAGE';

export const receiveImage = (imageString) => ({
  type: RECEIVE_IMAGE,
  imageString
});