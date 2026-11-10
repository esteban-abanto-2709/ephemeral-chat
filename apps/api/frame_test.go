package main

import (
	"bytes"
	"testing"
)

func TestFrameRoundTrip(t *testing.T) {
	frame, err := encodeFrame(map[string]string{"type": "file"}, []byte{0, 1, 2, 3})
	if err != nil {
		t.Fatal(err)
	}
	header, data, ok := decodeFrame(frame)
	if !ok || string(header) != `{"type":"file"}` || !bytes.Equal(data, []byte{0, 1, 2, 3}) {
		t.Errorf("got %q %v %v", header, data, ok)
	}

	frame, _ = encodeFrame(map[string]string{}, nil)
	if _, data, ok := decodeFrame(frame); !ok || len(data) != 0 {
		t.Errorf("empty data: got %v %v", data, ok)
	}
}

func TestDecodeFrameRejectsBrokenFrames(t *testing.T) {
	cases := map[string][]byte{
		"empty":        nil,
		"short prefix": {0, 0, 1},
		"lying length": {0, 0, 0, 9, '{', '}'},
		"huge length":  {0xff, 0xff, 0xff, 0xff, '{'},
	}
	for name, frame := range cases {
		if _, _, ok := decodeFrame(frame); ok {
			t.Errorf("%s: ok = true, want false", name)
		}
	}
}
