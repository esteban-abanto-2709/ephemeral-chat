package main

import (
	"encoding/binary"
	"encoding/json"
	"io"
)

const frameHeaderPrefix = 4

func writeFrame(w io.Writer, header any, data []byte) error {
	head, err := json.Marshal(header)
	if err != nil {
		return err
	}
	prefix := make([]byte, frameHeaderPrefix, frameHeaderPrefix+len(head))
	binary.BigEndian.PutUint32(prefix, uint32(len(head)))
	if _, err := w.Write(append(prefix, head...)); err != nil {
		return err
	}
	_, err = w.Write(data)
	return err
}

func decodeFrame(frame []byte) (header, data []byte, ok bool) {
	if len(frame) < frameHeaderPrefix {
		return nil, nil, false
	}
	size := uint64(binary.BigEndian.Uint32(frame))
	rest := frame[frameHeaderPrefix:]
	if size > uint64(len(rest)) {
		return nil, nil, false
	}
	return rest[:size], rest[size:], true
}
