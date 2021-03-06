; Script generated by the Inno Script Studio Wizard.
; SEE THE DOCUMENTATION FOR DETAILS ON CREATING INNO SETUP SCRIPT FILES!

#define MyAppName "Sensel Morph Ableton Remote Scripts"
#define MyAppVersion "0.14"
#define MyAppPublisher "Sensel, Inc."
#define MyAppURL "http://guide.sensel.com/morph_software/#ableton-live-control-surface"
#define MyAppExeName "SenselMorph_LiveScripts.exe"

[Setup]
; NOTE: The value of AppId uniquely identifies this application.
; Do not use the same AppId value in installers for other applications.
; (To generate a new GUID, click Tools | Generate GUID inside the IDE.)

AppId={{6BAEAE04-9E31-47D0-B30C-B0166581E500}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
;AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={commonappdata}\Ableton\Live 10\Resources\MIDI Remote Scripts
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
OutputBaseFilename=SenselMorph_Live_Setup
Compression=lzma
SolidCompression=yes
CreateAppDir=no
LicenseFile=EULA.txt
SignTool=signtool
OutputDir=.


[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Files]
; NOTE: Don't use "Flags: ignoreversion" on any shared system files
Source: "..\..\..\Ableton\Sensel_Morph\*"; DestDir: "{commonappdata}\Ableton\Live 10 Trial\Resources\MIDI Remote Scripts\Sensel_Morph"; Check: TrialCheck(); Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\..\..\Ableton\Sensel_Morph\*"; DestDir: "{commonappdata}\Ableton\Live 10 Suite\Resources\MIDI Remote Scripts\Sensel_Morph"; Check: SuiteCheck(); Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\..\..\Ableton\Sensel_Morph\*"; DestDir: "{commonappdata}\Ableton\Live 10 Standard\Resources\MIDI Remote Scripts\Sensel_Morph"; Check: StdCheck(); Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\..\..\Ableton\Sensel_Morph\*"; DestDir: "{commonappdata}\Ableton\Live 10 Lite\Resources\MIDI Remote Scripts\Sensel_Morph"; Check: LiteCheck(); Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\..\..\Ableton\Project\*"; DestDir: "{userdocs}\Sensel Morph\Ableton\Project"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\..\..\Ableton\Overlays\*"; DestDir: "{userdocs}\Sensel Morph\Ableton\Overlay Maps"; Flags: ignoreversion recursesubdirs createallsubdirs

[Code]

function TrialCheck(): Boolean;
begin
  Result := DirExists(ExpandConstant('{commonappdata}\Ableton\Live 10 Trial\Resources\MIDI Remote Scripts'));
end;

function SuiteCheck(): Boolean;
begin
  Result := DirExists(ExpandConstant('{commonappdata}\Ableton\Live 10 Suite\Resources\MIDI Remote Scripts'));
end;

function StdCheck(): Boolean;
begin
  Result := DirExists(ExpandConstant('{commonappdata}\Ableton\Live 10 Standard\Resources\MIDI Remote Scripts'));
end;

function LiteCheck(): Boolean;
begin
  Result := DirExists(ExpandConstant('{commonappdata}\Ableton\Live 10 Lite\Resources\MIDI Remote Scripts'));
end;