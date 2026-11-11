package main

import (
	"bytes"
	"testing"
)

type recordingWriter struct{ writes [][]byte }

func (w *recordingWriter) Write(p []byte) (int, error) {
	w.writes = append(w.writes, p)
	return len(p), nil
}

func TestFrameRoundTrip(t *testing.T) {
	var buf bytes.Buffer
	if err := writeFrame(&buf, map[string]string{"type": "file"}, []byte{0, 1, 2, 3}); err != nil {
		t.Fatal(err)
	}
	header, data, ok := decodeFrame(buf.Bytes())
	if !ok || string(header) != `{"type":"file"}` || !bytes.Equal(data, []byte{0, 1, 2, 3}) {
		t.Errorf("got %q %v %v", header, data, ok)
	}

	buf.Reset()
	writeFrame(&buf, map[string]string{}, nil)
	if _, data, ok := decodeFrame(buf.Bytes()); !ok || len(data) != 0 {
		t.Errorf("empty data: got %v %v", data, ok)
	}
}

func TestWriteFrameNeverCopiesTheData(t *testing.T) {
	data := []byte{1, 2, 3, 4}
	w := &recordingWriter{}
	if err := writeFrame(w, map[string]string{"type": "file"}, data); err != nil {
		t.Fatal(err)
	}
	if len(w.writes) != 2 {
		t.Fatalf("got %d writes, want 2", len(w.writes))
	}
	got := w.writes[1]
	if len(got) != len(data) || &got[0] != &data[0] {
		t.Error("the second write is not the data's own memory")
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
