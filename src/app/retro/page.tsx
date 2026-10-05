import { MacWindow, MacDialog, FolderIcon } from "@/components/ui/MacUI";

export default function RetroPreview() {
  return (
    <div className="mac-desktop">
      <MacWindow title="Notes" className="w-[300px]">
        <h2 style={{ textAlign: "center", margin: 0 }}>REMEMBER</h2>
        <p style={{ textAlign: "center" }}>
          Your mental health is a priority. Give yourself time.
        </p>
      </MacWindow>

      <MacDialog
        actions={
          <>
            <button className="mac-btn">취소</button>
            <button className="mac-btn mac-btn--default">확인</button>
          </>
        }
      >
        정말 삭제하시겠습니까?
      </MacDialog>

      <FolderIcon label="Social Life" href="/" />
      <FolderIcon label="Banana Bread" href="/" />
    </div>
  );
}
