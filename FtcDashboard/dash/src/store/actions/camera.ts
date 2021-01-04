export const RECEIVE_IMAGE = 'RECEIVE_IMAGE';

export type ReceiveImageAction = {
  type: typeof RECEIVE_IMAGE;
  imageString: string;
};

export const receiveImage = (imageString: string): ReceiveImageAction => ({
  type: RECEIVE_IMAGE,
  imageString,
});
